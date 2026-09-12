# Battle History

A running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run `node tools/battle-simulator/analysis/xp-budget-battery.mjs` to add a new dated entry.

## 2026-08-25 — XP-budget battery (seeds 1-15)

**XP-budget tiers** (same 4-PC party throughout: Lunar-17, Tapkey, Bennit, Vorza Moonshot; opposition grows one real fixture at a time):

### Moderate (80xp budget) — n=15

- Outcomes: party-victory=14, timeout=1
- Mean rounds to resolution: 8.7
- Mean party final HP: 97.6% of max
- Mean party damage taken: 14.3
- Mean party healing received: 24.0
- Cover usage — move-into-cover rate: 35.6%, attack-from-cover rate: 21.2%
### Severe (120xp budget) — n=15

- Outcomes: party-victory=15
- Mean rounds to resolution: 6.1
- Mean party final HP: 96.8% of max
- Mean party damage taken: 33.0
- Mean party healing received: 48.0
- Cover usage — move-into-cover rate: 36.3%, attack-from-cover rate: 21.2%
### Extreme (160xp budget) — n=15

- Outcomes: party-victory=9, party-defeat=5, timeout=1
- Mean rounds to resolution: 11.9
- Mean party final HP: 53.2% of max
- Mean party damage taken: 84.5
- Mean party healing received: 67.3
- Cover usage — move-into-cover rate: 39.7%, attack-from-cover rate: 20.6%

**Ranged-combat/cover investigation:**

### Ranged duel (Obozaya vs. Kuriaku) — n=15

- Outcomes: party-victory=5, party-defeat=7, timeout=3
- Mean rounds to resolution: 18.4
- Mean party final HP: 17.5% of max
- Mean party damage taken: 21.1
- Mean party healing received: 0.0
- Cover usage — move-into-cover rate: 25.3%, attack-from-cover rate: 31.0%

---
## 2026-08-31 — No-maneuvers baseline comparison

### No-maneuvers baseline comparison (design doc §43) — seeds 1-15, n=15 each

Same roster (Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth+Tough), same seeds, same RANDOM_ARCS deployment. The only variable: the party's own Trip/Shove/Grapple.

| | WITH maneuvers | WITHOUT maneuvers |
|---|---|---|
| Party win rate | 40.0% | 66.7% |
| Mean party final HP | 21.5% | 49.4% |
| Mean party damage taken | 112.6 | 100.9 |
| Mean rounds to resolution | 7.9 | 9.3 |

Maneuver conversion (WITH-maneuvers run only): Trip 35 attempts, 96.4% converted before expiring; Grapple 103 attempts, 97.0% converted.

---
## 2026-08-31 — No-maneuvers baseline comparison

### No-maneuvers baseline comparison (design doc §43) — seeds 1-15, n=15 each

Same roster (Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth+Tough), same seeds, same RANDOM_ARCS deployment. The only variable: the party's own Trip/Shove/Grapple.

| | WITH maneuvers | WITHOUT maneuvers |
|---|---|---|
| Party win rate | 60.0% | 46.7% |
| Mean party final HP | 46.0% | 31.9% |
| Mean party damage taken | 94.5 | 104.4 |
| Mean rounds to resolution | 7.8 | 7.4 |

Maneuver conversion (WITH-maneuvers run only): Trip 67 attempts, 100.0% converted before expiring; Grapple 8 attempts, 91.7% converted.

---
## 2026-08-31 — No-maneuvers baseline comparison

### No-maneuvers baseline comparison (design doc §43) — seeds 1-2, n=2 each

Same roster (Lunar-17+Tapkey+Bennit+Vorza Moonshot vs. Security Goon+Xenowarden Greenhorn+Erabryth+Tough), same seeds, same RANDOM_ARCS deployment. The only variable: the party's own Trip/Shove/Grapple.

| | WITH maneuvers | WITHOUT maneuvers |
|---|---|---|
| Party win rate | 100.0% | 0.0% |
| Mean party final HP | 94.0% | 0.0% |
| Mean party damage taken | 72.0 | 97.0 |
| Mean rounds to resolution | 7.0 | 7.5 |

Maneuver conversion (WITH-maneuvers run only): Trip 9 attempts, 100.0% converted before expiring; Grapple 2 attempts, 50.0% converted.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-50, n=50

`baseline-v1` (party) vs. `no-maneuvers-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 80.0%
- no-maneuvers-v1 win rate: 10.0%
- Timeout rate: 10.0%
- Mean rounds to resolution: 11.0

Parallel tournament runner (worker_threads, concurrency=8): 4012ms vs. 8197ms sequential — 2.0x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json, seeds 1-6, n=6

`aggressive-v1` (party) vs. `cautious-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- aggressive-v1 win rate: 50.0%
- cautious-v1 win rate: 33.3%
- Timeout rate: 16.7%
- Mean rounds to resolution: 11.0

Parallel tournament runner (worker_threads, concurrency=8): 463ms vs. 388ms sequential — 0.8x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-30, n=30

`baseline-v1` (party) vs. `mindless-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 96.7%
- mindless-v1 win rate: 3.3%
- Timeout rate: 0.0%
- Mean rounds to resolution: 7.3

Parallel tournament runner (worker_threads, concurrency=8): 1618ms vs. 2252ms sequential — 1.4x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-30, n=30

`aggressive-v1` (party) vs. `cautious-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- aggressive-v1 win rate: 86.7%
- cautious-v1 win rate: 0.0%
- Timeout rate: 13.3%
- Mean rounds to resolution: 12.0

Parallel tournament runner (worker_threads, concurrency=8): 3634ms vs. 5828ms sequential — 1.6x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-30, n=30

`brawler-v1` (party) vs. `flanker-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- brawler-v1 win rate: 26.7%
- flanker-v1 win rate: 0.0%
- Timeout rate: 73.3%
- Mean rounds to resolution: 17.9

Parallel tournament runner (worker_threads, concurrency=8): 2852ms vs. 4439ms sequential — 1.6x.

---
## 2026-08-31 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 10 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 11 member(s): baseline-v1, search-checkpoint-1, search-checkpoint-2, search-checkpoint-3, search-checkpoint-4, search-checkpoint-5, search-checkpoint-6, search-checkpoint-7, search-checkpoint-8, search-checkpoint-9, search-checkpoint-10.
Final best: `search-checkpoint-10`.

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | maneuverTempoDenial | 0.6027x | baseline-v1:81.3% | 6/6 beaten | **PROMOTED -> search-checkpoint-1** |
| 2 | resource | 1.5811x | baseline-v1:81.3%, search-checkpoint-1:75.0% | 6/6 beaten | **PROMOTED -> search-checkpoint-2** |
| 3 | mobilityDenial | 0.8811x | baseline-v1:81.3%, search-checkpoint-1:75.0%, search-checkpoint-2:75.0% | 6/6 beaten | **PROMOTED -> search-checkpoint-3** |
| 4 | tempoDenial | 1.3207x | baseline-v1:81.3%, search-checkpoint-1:75.0%, search-checkpoint-2:75.0%, search-checkpoint-3:75.0% | 6/6 beaten | **PROMOTED -> search-checkpoint-4** |
| 5 | closing | 1.5948x | baseline-v1:87.5%, search-checkpoint-1:87.5%, search-checkpoint-2:87.5%, search-checkpoint-3:87.5%, search-checkpoint-4:87.5% | 6/6 beaten | **PROMOTED -> search-checkpoint-5** |
| 6 | closing | 1.0888x | baseline-v1:87.5%, search-checkpoint-1:87.5%, search-checkpoint-2:87.5%, search-checkpoint-3:87.5%, search-checkpoint-4:87.5%, search-checkpoint-5:81.3% | 6/6 beaten | **PROMOTED -> search-checkpoint-6** |
| 7 | allyDamage | 1.0037x | baseline-v1:87.5%, search-checkpoint-1:87.5%, search-checkpoint-2:87.5%, search-checkpoint-3:87.5%, search-checkpoint-4:87.5%, search-checkpoint-5:81.3%, search-checkpoint-6:81.3% | 6/6 beaten | **PROMOTED -> search-checkpoint-7** |
| 8 | offensiveReach | 0.7545x | baseline-v1:75.0%, search-checkpoint-1:75.0%, search-checkpoint-2:75.0%, search-checkpoint-3:75.0%, search-checkpoint-4:75.0%, search-checkpoint-5:81.3%, search-checkpoint-6:81.3%, search-checkpoint-7:81.3% | 6/6 beaten | **PROMOTED -> search-checkpoint-8** |
| 9 | resource | 0.6674x | baseline-v1:75.0%, search-checkpoint-1:75.0%, search-checkpoint-2:75.0%, search-checkpoint-3:75.0%, search-checkpoint-4:75.0%, search-checkpoint-5:81.3%, search-checkpoint-6:81.3%, search-checkpoint-7:81.3%, search-checkpoint-8:81.3% | 6/6 beaten | **PROMOTED -> search-checkpoint-9** |
| 10 | closing | 1.3671x | baseline-v1:93.8%, search-checkpoint-1:93.8%, search-checkpoint-2:93.8%, search-checkpoint-3:93.8%, search-checkpoint-4:93.8%, search-checkpoint-5:87.5%, search-checkpoint-6:87.5%, search-checkpoint-7:87.5%, search-checkpoint-8:93.8%, search-checkpoint-9:93.8% | 6/6 beaten | **PROMOTED -> search-checkpoint-10** |

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-40, n=40

`baseline-v1` (party) vs. `baseline-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 82.5%
- baseline-v1 win rate: 5.0%
- Timeout rate: 12.5%
- Mean rounds to resolution: 11.6

Parallel tournament runner (worker_threads, concurrency=8): 4044ms vs. 9531ms sequential — 2.4x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-40, n=40

`baseline-v1` (party) vs. `baseline-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 15.0%
- baseline-v1 win rate: 10.0%
- Timeout rate: 75.0%
- Mean rounds to resolution: 18.1

Parallel tournament runner (worker_threads, concurrency=8): 6669ms vs. 15036ms sequential — 2.3x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-40, n=40

`baseline-v1` (party) vs. `baseline-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 27.5%
- baseline-v1 win rate: 30.0%
- Timeout rate: 42.5%
- Mean rounds to resolution: 29.8

Parallel tournament runner (worker_threads, concurrency=8): 9346ms vs. 25133ms sequential — 2.7x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-40, n=40

`baseline-v1` (party) vs. `baseline-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 22.5%
- baseline-v1 win rate: 22.5%
- Timeout rate: 55.0%
- Mean rounds to resolution: 24.9

Parallel tournament runner (worker_threads, concurrency=8): 8071ms vs. 20867ms sequential — 2.6x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-50, n=50

`baseline-v1` (party) vs. `no-maneuvers-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 32.0%
- no-maneuvers-v1 win rate: 16.0%
- Timeout rate: 52.0%
- Mean rounds to resolution: 23.7

Parallel tournament runner (worker_threads, concurrency=8): 10789ms vs. 25249ms sequential — 2.3x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-30, n=30

`baseline-v1` (party) vs. `mindless-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 90.0%
- mindless-v1 win rate: 10.0%
- Timeout rate: 0.0%
- Mean rounds to resolution: 8.9

Parallel tournament runner (worker_threads, concurrency=8): 2267ms vs. 4313ms sequential — 1.9x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-30, n=30

`aggressive-v1` (party) vs. `cautious-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- aggressive-v1 win rate: 56.7%
- cautious-v1 win rate: 10.0%
- Timeout rate: 33.3%
- Mean rounds to resolution: 21.0

Parallel tournament runner (worker_threads, concurrency=8): 7217ms vs. 13594ms sequential — 1.9x.

---
## 2026-08-31 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-30, n=30

`brawler-v1` (party) vs. `flanker-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- brawler-v1 win rate: 0.0%
- flanker-v1 win rate: 3.3%
- Timeout rate: 96.7%
- Mean rounds to resolution: 29.9

Parallel tournament runner (worker_threads, concurrency=8): 4879ms vs. 10763ms sequential — 2.2x.

---
## 2026-08-31 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 10 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | maneuverTempoDenial | 0.6027x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2 | resource | 1.5811x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3 | mobilityDenial | 0.8811x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 4 | tempoDenial | 1.3207x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 5 | closing | 1.5948x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 6 | closing | 1.0888x | baseline-v1:43.8% | 3/6 beaten | rejected |
| 7 | allyDamage | 1.0037x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 8 | offensiveReach | 0.7545x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 9 | resource | 0.6674x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 10 | closing | 1.3671x | baseline-v1:50.0% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 3 generations, 1-24 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | enemyDamage | 0.662x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2 | mobilityDenial | 1.299x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 3 | resource | 1.0055x | baseline-v1:20.8% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 3 generations, 1-24 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | offensiveReach | 1.4048x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 2 | tempoDenial | 1.2902x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 3 | enemyDamage | 1.4175x | baseline-v1:20.8% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 3 generations, 1-4 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | tempoDenial | 1.0483x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 2 | setupValue | 1.2697x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 3 | threatExposure | 1.1266x | baseline-v1:25.0% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 6 generations, 1-4 seeds/matchup

Resumed from a checkpoint at generation 3 (an earlier run interrupted, e.g. by a machine restart) — the table below covers only generations 4-6; the league/final-best summary reflects the FULL run.

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 4 | offensiveReach | 1.2247x | baseline-v1:25.0% | 4/6 beaten | rejected |
| 5 | setupValue | 1.0723x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 6 | offensiveReach | 1.4821x | baseline-v1:25.0% | 2/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 320 generations, 1-24 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | lowHpCaution | 0.925x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 2 | offensiveReach | 1.138x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 3 | setupValue | 1.2308x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 4 | resource | 0.9572x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 5 | outnumberedCaution | 0.714x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 6 | outnumberedCaution | 0.8015x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 7 | closing | 1.435x | baseline-v1:50.0% | 4/6 beaten | rejected |
| 8 | tempoDenial | 0.741x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 9 | maneuverTempoDenial | 0.9667x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 10 | mobilityDenial | 0.6392x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 11 | setupValue | 0.6622x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 12 | allyDamage | 0.7919x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 13 | enemyDamage | 1.5401x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 14 | closing | 1.2347x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 15 | mobilityDenial | 0.8328x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 16 | resource | 0.9482x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 17 | enemyDamage | 1.1212x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 18 | allyDamage | 0.6578x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 19 | mobilityDenial | 1.405x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 20 | enemyDamage | 1.5821x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 21 | enemyDamage | 1.5724x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 22 | resource | 0.7948x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 23 | maneuverTempoDenial | 0.6515x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 24 | outnumberedCaution | 1.5116x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 25 | outnumberedCaution | 1.0457x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 26 | mobilityDenial | 0.6711x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 27 | lowHpCaution | 1.58x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 28 | outnumberedCaution | 1.2416x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 29 | resource | 0.6331x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 30 | setupValue | 1.4388x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 31 | tempoDenial | 0.9125x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 32 | setupValue | 1.5284x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 33 | closing | 0.9493x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 34 | enemyDamage | 1.5523x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 35 | objective | 1.0383x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 36 | outnumberedCaution | 1.4674x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 37 | setupValue | 1.0318x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 38 | threatExposure | 1.2462x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 39 | maneuverTempoDenial | 1.3132x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 40 | mobilityDenial | 0.8051x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 41 | offensiveReach | 0.9453x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 42 | resource | 0.6275x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 43 | offensiveReach | 1.4307x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 44 | threatExposure | 1.377x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 45 | closing | 1.0191x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 46 | closing | 1.4438x | baseline-v1:50.0% | 4/6 beaten | rejected |
| 47 | resource | 1.5895x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 48 | offensiveReach | 0.6851x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 49 | lowHpCaution | 0.6206x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 50 | lowHpCaution | 1.3819x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 51 | maneuverTempoDenial | 0.8866x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 52 | objective | 1.2515x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 53 | allyDamage | 0.7879x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 54 | lowHpCaution | 1.5755x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 55 | maneuverTempoDenial | 0.714x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 56 | tempoDenial | 1.5456x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 57 | enemyDamage | 1.1782x | baseline-v1:12.5% | 3/6 beaten | rejected |
| 58 | resource | 1.3178x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 59 | setupValue | 1.0252x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 60 | resource | 0.6681x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 61 | setupValue | 1.0453x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 62 | threatExposure | 1.1825x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 63 | closing | 1.1695x | baseline-v1:45.8% | 3/6 beaten | rejected |
| 64 | resource | 0.9034x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 65 | threatExposure | 1.5064x | baseline-v1:29.2% | 2/6 beaten | rejected |
| 66 | tempoDenial | 1.1197x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 67 | threatExposure | 0.7557x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 68 | offensiveReach | 1.4219x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 69 | threatExposure | 1.5776x | baseline-v1:33.3% | 2/6 beaten | rejected |
| 70 | threatExposure | 1.4168x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 71 | objective | 0.9147x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 72 | lowHpCaution | 1.5113x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 73 | objective | 1.0054x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 74 | outnumberedCaution | 1.4938x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 75 | objective | 1.0287x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 76 | setupValue | 1.5228x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 77 | resource | 1.4342x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 78 | allyDamage | 0.974x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 79 | objective | 0.7391x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 80 | objective | 1.502x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 81 | offensiveReach | 0.882x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 82 | setupValue | 0.7187x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 83 | threatExposure | 0.6593x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 84 | maneuverTempoDenial | 1.2821x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 85 | tempoDenial | 1.389x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 86 | objective | 1.4583x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 87 | enemyDamage | 1.2742x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 88 | maneuverTempoDenial | 1.457x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 89 | threatExposure | 1.1511x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 90 | threatExposure | 0.9978x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 91 | objective | 1.4827x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 92 | tempoDenial | 1.3484x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 93 | enemyDamage | 1.2768x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 94 | allyDamage | 1.4931x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 95 | enemyDamage | 0.8583x | baseline-v1:41.7% | 3/6 beaten | rejected |
| 96 | allyDamage | 1.523x | baseline-v1:25.0% | 4/6 beaten | rejected |
| 97 | allyDamage | 1.2515x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 98 | resource | 1.1001x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 99 | enemyDamage | 0.961x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 100 | resource | 1.5151x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 101 | allyDamage | 1.2634x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 102 | tempoDenial | 0.7738x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 103 | enemyDamage | 1.0923x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 104 | outnumberedCaution | 1.134x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 105 | maneuverTempoDenial | 1.2435x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 106 | closing | 1.2853x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 107 | allyDamage | 1.0572x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 108 | threatExposure | 1.2649x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 109 | enemyDamage | 1.3038x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 110 | setupValue | 0.825x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 111 | allyDamage | 0.963x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 112 | mobilityDenial | 0.9771x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 113 | closing | 1.1091x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 114 | maneuverTempoDenial | 1.023x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 115 | enemyDamage | 1.171x | baseline-v1:12.5% | 3/6 beaten | rejected |
| 116 | maneuverTempoDenial | 0.947x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 117 | resource | 1.2075x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 118 | outnumberedCaution | 0.6544x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 119 | mobilityDenial | 1.4808x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 120 | allyDamage | 0.9672x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 121 | closing | 0.617x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 122 | resource | 1.5717x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 123 | threatExposure | 0.7969x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 124 | enemyDamage | 0.6088x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 125 | tempoDenial | 1.0634x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 126 | resource | 1.3672x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 127 | threatExposure | 1.1239x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 128 | outnumberedCaution | 1.3708x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 129 | allyDamage | 1.218x | baseline-v1:29.2% | 4/6 beaten | rejected |
| 130 | maneuverTempoDenial | 0.675x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 131 | resource | 0.9244x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 132 | mobilityDenial | 0.9423x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 133 | threatExposure | 1.5015x | baseline-v1:29.2% | 2/6 beaten | rejected |
| 134 | lowHpCaution | 1.0195x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 135 | lowHpCaution | 0.8531x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 136 | enemyDamage | 1.3459x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 137 | resource | 1.4095x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 138 | setupValue | 0.6957x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 139 | outnumberedCaution | 1.3574x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 140 | resource | 0.9723x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 141 | offensiveReach | 1.1488x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 142 | maneuverTempoDenial | 0.9123x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 143 | threatExposure | 0.715x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 144 | resource | 0.9555x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 145 | maneuverTempoDenial | 0.6087x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 146 | allyDamage | 0.8872x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 147 | setupValue | 1.4063x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 148 | mobilityDenial | 0.7243x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 149 | enemyDamage | 0.7341x | baseline-v1:50.0% | 4/6 beaten | rejected |
| 150 | outnumberedCaution | 0.8555x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 151 | objective | 1.2129x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 152 | allyDamage | 1.1666x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 153 | closing | 1.095x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 154 | objective | 1.174x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 155 | objective | 1.3771x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 156 | outnumberedCaution | 1.0502x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 157 | enemyDamage | 0.6961x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 158 | lowHpCaution | 0.9102x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 159 | closing | 0.8313x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 160 | outnumberedCaution | 0.6665x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 161 | outnumberedCaution | 0.9929x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 162 | outnumberedCaution | 0.9084x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 163 | outnumberedCaution | 0.8467x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 164 | threatExposure | 1.0765x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 165 | maneuverTempoDenial | 0.9522x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 166 | resource | 1.4211x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 167 | closing | 1.176x | baseline-v1:45.8% | 3/6 beaten | rejected |
| 168 | maneuverTempoDenial | 0.7555x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 169 | mobilityDenial | 0.7022x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 170 | tempoDenial | 1.5081x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 171 | maneuverTempoDenial | 0.9919x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 172 | lowHpCaution | 1.4796x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 173 | closing | 1.2603x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 174 | objective | 0.8812x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 175 | enemyDamage | 1.2713x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 176 | setupValue | 0.7292x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 177 | allyDamage | 0.8187x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 178 | lowHpCaution | 1.1065x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 179 | tempoDenial | 0.6606x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 180 | resource | 0.9384x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 181 | threatExposure | 1.099x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 182 | maneuverTempoDenial | 0.8578x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 183 | mobilityDenial | 1.266x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 184 | setupValue | 1.2568x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 185 | lowHpCaution | 0.9855x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 186 | threatExposure | 0.7621x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 187 | threatExposure | 1.3864x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 188 | closing | 1.3659x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 189 | mobilityDenial | 1.4733x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 190 | maneuverTempoDenial | 1.1142x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 191 | mobilityDenial | 0.9681x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 192 | threatExposure | 1.1632x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 193 | offensiveReach | 1.5722x | baseline-v1:25.0% | 2/6 beaten | rejected |
| 194 | enemyDamage | 1.3041x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 195 | outnumberedCaution | 0.6589x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 196 | resource | 1.0379x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 197 | enemyDamage | 1.5496x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 198 | lowHpCaution | 1.3432x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 199 | maneuverTempoDenial | 1.5175x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 200 | allyDamage | 0.8739x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 201 | closing | 1.133x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 202 | closing | 0.9663x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 203 | mobilityDenial | 0.6803x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 204 | setupValue | 0.7814x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 205 | resource | 0.6002x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 206 | objective | 0.6286x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 207 | maneuverTempoDenial | 0.7034x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 208 | lowHpCaution | 1.2799x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 209 | tempoDenial | 1.2993x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 210 | offensiveReach | 0.6791x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 211 | offensiveReach | 0.989x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 212 | threatExposure | 1.1256x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 213 | mobilityDenial | 0.8206x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 214 | maneuverTempoDenial | 1.1825x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 215 | enemyDamage | 1.2028x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 216 | resource | 1.3911x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 217 | setupValue | 1.129x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 218 | resource | 1.1316x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 219 | enemyDamage | 1.3858x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 220 | setupValue | 1.4537x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 221 | allyDamage | 0.7614x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 222 | outnumberedCaution | 1.3931x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 223 | mobilityDenial | 1.4109x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 224 | closing | 1.1104x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 225 | setupValue | 0.7326x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 226 | mobilityDenial | 1.3781x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 227 | threatExposure | 0.7181x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 228 | threatExposure | 0.6053x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 229 | setupValue | 1.323x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 230 | closing | 1.3469x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 231 | resource | 0.7071x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 232 | objective | 1.2708x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 233 | maneuverTempoDenial | 0.6477x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 234 | setupValue | 1.2699x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 235 | threatExposure | 1.2663x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 236 | lowHpCaution | 1.2101x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 237 | lowHpCaution | 0.7512x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 238 | allyDamage | 0.6136x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 239 | tempoDenial | 1.064x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 240 | offensiveReach | 1.1143x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 241 | tempoDenial | 0.8664x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 242 | allyDamage | 1.5356x | baseline-v1:25.0% | 4/6 beaten | rejected |
| 243 | resource | 1.4669x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 244 | lowHpCaution | 1.3322x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 245 | closing | 1.5965x | baseline-v1:50.0% | 4/6 beaten | rejected |
| 246 | maneuverTempoDenial | 1.2342x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 247 | mobilityDenial | 0.7338x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 248 | tempoDenial | 0.9813x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 249 | resource | 0.7392x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 250 | outnumberedCaution | 0.9502x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 251 | enemyDamage | 1.5037x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 252 | tempoDenial | 1.0765x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 253 | setupValue | 0.946x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 254 | maneuverTempoDenial | 1.5743x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 255 | threatExposure | 0.6059x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 256 | threatExposure | 1.1117x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 257 | closing | 1.3202x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 258 | enemyDamage | 1.2699x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 259 | threatExposure | 1.0264x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 260 | setupValue | 0.84x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 261 | threatExposure | 1.3192x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 262 | allyDamage | 0.7118x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 263 | lowHpCaution | 0.8854x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 264 | outnumberedCaution | 1.1288x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 265 | outnumberedCaution | 1.4315x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 266 | threatExposure | 1.4227x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 267 | resource | 1.3948x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 268 | mobilityDenial | 1.5969x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 269 | offensiveReach | 0.6555x | baseline-v1:29.2% | 2/6 beaten | rejected |
| 270 | maneuverTempoDenial | 0.7597x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 271 | outnumberedCaution | 1.4667x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 272 | tempoDenial | 1.2749x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 273 | outnumberedCaution | 0.9769x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 274 | enemyDamage | 1.2963x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 275 | resource | 1.3672x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 276 | maneuverTempoDenial | 1.0914x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 277 | threatExposure | 1.0257x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 278 | setupValue | 1.3837x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 279 | maneuverTempoDenial | 0.8183x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 280 | tempoDenial | 1.3734x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 281 | threatExposure | 1.2934x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 282 | closing | 0.631x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 283 | threatExposure | 1.0231x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 284 | lowHpCaution | 1.3724x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 285 | objective | 0.9285x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 286 | maneuverTempoDenial | 1.2668x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 287 | offensiveReach | 1.4452x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 288 | closing | 0.7783x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 289 | lowHpCaution | 1.2104x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 290 | threatExposure | 0.9697x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 291 | lowHpCaution | 1.3792x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 292 | offensiveReach | 0.6325x | baseline-v1:29.2% | 2/6 beaten | rejected |
| 293 | lowHpCaution | 0.8149x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 294 | lowHpCaution | 1.5235x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 295 | enemyDamage | 0.6144x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 296 | setupValue | 0.6188x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 297 | lowHpCaution | 1.5714x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 298 | enemyDamage | 0.8068x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 299 | lowHpCaution | 0.7021x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 300 | objective | 1.5078x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 301 | enemyDamage | 0.9594x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 302 | mobilityDenial | 1.0906x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 303 | allyDamage | 1.0377x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 304 | lowHpCaution | 1.5513x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 305 | resource | 0.6967x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 306 | threatExposure | 1.3292x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 307 | closing | 0.7357x | baseline-v1:16.7% | 3/6 beaten | rejected |
| 308 | mobilityDenial | 1.5167x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 309 | threatExposure | 1.4558x | baseline-v1:29.2% | 3/6 beaten | rejected |
| 310 | enemyDamage | 1.5584x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 311 | tempoDenial | 0.8744x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 312 | tempoDenial | 1.4935x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 313 | threatExposure | 0.7685x | baseline-v1:33.3% | 3/6 beaten | rejected |
| 314 | mobilityDenial | 1.0194x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 315 | allyDamage | 0.8248x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 316 | tempoDenial | 1.4638x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 317 | resource | 1.4141x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 318 | objective | 1.2913x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 319 | maneuverTempoDenial | 1.0213x | baseline-v1:20.8% | 3/6 beaten | rejected |
| 320 | maneuverTempoDenial | 0.7395x | baseline-v1:20.8% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 6 generations, 1-4 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | lowHpCaution | 1.3727x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 2 | threatExposure | 1.2232x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 3 | enemyDamage | 1.1922x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 4 | lowHpCaution | 1.0581x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 5 | setupValue | 0.8294x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 6 | outnumberedCaution | 1.3406x | baseline-v1:25.0% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 15 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | tempoDenial | 1.5175x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2 | lowHpCaution | 1.4021x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 3 | tempoDenial | 1.0483x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 4 | threatExposure | 0.6836x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 5 | enemyDamage | 1.5967x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 6 | mobilityDenial | 0.7293x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 7 | closing | 0.9881x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 8 | closing | 1.5257x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 9 | offensiveReach | 1.4082x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 10 | mobilityDenial | 0.7579x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 11 | closing | 1.2954x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 12 | tempoDenial | 1.0818x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 13 | offensiveReach | 0.9423x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 14 | closing | 1.1172x | baseline-v1:43.8% | 3/6 beaten | rejected |
| 15 | enemyDamage | 1.1127x | baseline-v1:31.3% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 15 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | resource | 1.5175x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2 | maneuverTempoDenial | 1.4021x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 3 | closing | 1.0483x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 4 | threatExposure | 0.6836x | baseline-v1:25.0% | 3/6 beaten | rejected |
| 5 | enemyDamage | 1.5967x | baseline-v1:37.5% | 3/6 beaten | rejected |
| 6 | setupValue | 0.7293x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 7 | closing | 0.9881x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 8 | closing | 1.5257x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 9 | offensiveReach | 1.4082x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 10 | mobilityDenial | 0.7579x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 11 | closing | 1.2954x | baseline-v1:50.0% | 3/6 beaten | rejected |
| 12 | resource | 1.0818x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 13 | offensiveReach | 0.9423x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 14 | objective | 1.1172x | baseline-v1:31.3% | 3/6 beaten | rejected |
| 15 | enemyDamage | 1.1127x | baseline-v1:31.3% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 6 generations, 1-4 seeds/matchup

Starting profile: `baseline-v1`. League ended with 2 member(s): baseline-v1, search-checkpoint-1.
Final best: `search-checkpoint-1`.

| Gen | Mutated weight | Factor | League result | Archetype result | Verdict |
|---|---|---|---|---|---|
| 1 | enemyDamage | 0.662x | baseline-v1:75.0% | 4/6 beaten | **PROMOTED -> search-checkpoint-1** |
| 2 | mobilityDenial | 1.299x | baseline-v1:75.0%, search-checkpoint-1:25.0% | 4/6 beaten | rejected |
| 3 | maneuverTempoDenial | 1.0055x | baseline-v1:75.0%, search-checkpoint-1:25.0% | 4/6 beaten | rejected |
| 4 | closing | 0.8399x | baseline-v1:25.0%, search-checkpoint-1:25.0% | 4/6 beaten | rejected |
| 5 | maneuverTempoDenial | 1.3298x | baseline-v1:75.0%, search-checkpoint-1:25.0% | 4/6 beaten | rejected |
| 6 | threatExposure | 0.7559x | baseline-v1:50.0%, search-checkpoint-1:50.0% | 2/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 4 generations, 1-4 seeds/matchup

Starting profile: `baseline-v1`. League ended with 2 member(s): baseline-v1, search-checkpoint-1.
Final best: `search-checkpoint-1`.

| Gen | Mutation | League result | Archetype result | Verdict |
|---|---|---|---|---|
| 1 | closing x1.2271, enemyDamage x0.6027 | baseline-v1:75.0% | 3/6 beaten | **PROMOTED -> search-checkpoint-1** |
| 2 | closing x1.1274, enemyDamage x1.5811 | baseline-v1:50.0%, search-checkpoint-1:50.0% | 3/6 beaten | rejected |
| 3 | closing x1.5684, enemyDamage x0.8811 | baseline-v1:75.0%, search-checkpoint-1:25.0% | 3/6 beaten | rejected |
| 4 | closing x1.2128, enemyDamage x1.3207 | baseline-v1:50.0%, search-checkpoint-1:50.0% | 3/6 beaten | rejected |

---
## 2026-09-01 — Automated weight search

### Automated weight search (design doc §49) — lunar-17.json+security-goon.json, 50 generations, 1-24 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutation | League result | Archetype result | Verdict |
|---|---|---|---|---|
| 1 | closing x1.3526, enemyDamage x0.985 | baseline-v1:45.8% | 3/6 beaten | rejected |
| 2 | closing x1.1976, enemyDamage x0.8871 | baseline-v1:45.8% | 3/6 beaten | rejected |
| 3 | closing x1.0274, enemyDamage x0.7918 | baseline-v1:29.2% | 3/6 beaten | rejected |
| 4 | closing x1.3276, enemyDamage x1.4575 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 5 | closing x1.016, enemyDamage x1.5606 | baseline-v1:33.3% | 3/6 beaten | rejected |
| 6 | closing x0.8472, enemyDamage x0.7651 | baseline-v1:41.7% | 3/6 beaten | rejected |
| 7 | closing x0.8784, enemyDamage x1.1585 | baseline-v1:12.5% | 3/6 beaten | rejected |
| 8 | closing x0.8158, enemyDamage x0.8097 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 9 | closing x1.5693, enemyDamage x0.91 | baseline-v1:50.0% | 4/6 beaten | rejected |
| 10 | closing x0.7464, enemyDamage x0.9251 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 11 | closing x0.7017, enemyDamage x0.9101 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 12 | closing x0.9763, enemyDamage x1.5174 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 13 | closing x1.5276, enemyDamage x1.4989 | baseline-v1:33.3% | 3/6 beaten | rejected |
| 14 | closing x1.5562, enemyDamage x0.9039 | baseline-v1:50.0% | 4/6 beaten | rejected |
| 15 | closing x0.7915, enemyDamage x1.0404 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 16 | closing x0.8355, enemyDamage x0.8307 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 17 | closing x1.1172, enemyDamage x0.7423 | baseline-v1:50.0% | 4/6 beaten | rejected |
| 18 | closing x0.7671, enemyDamage x0.693 | baseline-v1:33.3% | 4/6 beaten | rejected |
| 19 | closing x1.4308, enemyDamage x1.0338 | baseline-v1:41.7% | 3/6 beaten | rejected |
| 20 | closing x1.4079, enemyDamage x1.3884 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 21 | closing x1.4723, enemyDamage x1.1422 | baseline-v1:41.7% | 4/6 beaten | rejected |
| 22 | closing x1.2249, enemyDamage x1.4141 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 23 | closing x0.803, enemyDamage x0.6044 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 24 | closing x0.9847, enemyDamage x1.0889 | baseline-v1:16.7% | 3/6 beaten | rejected |
| 25 | closing x1.1404, enemyDamage x0.8423 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 26 | closing x0.6199, enemyDamage x1.113 | baseline-v1:29.2% | 3/6 beaten | rejected |
| 27 | closing x1.0228, enemyDamage x1.3014 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 28 | closing x1.498, enemyDamage x1.5735 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 29 | closing x1.065, enemyDamage x1.1885 | baseline-v1:16.7% | 3/6 beaten | rejected |
| 30 | closing x1.4198, enemyDamage x0.871 | baseline-v1:45.8% | 4/6 beaten | rejected |
| 31 | closing x1.3006, enemyDamage x0.6821 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 32 | closing x0.6639, enemyDamage x1.313 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 33 | closing x1.3225, enemyDamage x1.3177 | baseline-v1:33.3% | 3/6 beaten | rejected |
| 34 | closing x1.1188, enemyDamage x1.5315 | baseline-v1:33.3% | 3/6 beaten | rejected |
| 35 | closing x1.3247, enemyDamage x1.1702 | baseline-v1:33.3% | 3/6 beaten | rejected |
| 36 | closing x1.3505, enemyDamage x1.2915 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 37 | closing x1.5036, enemyDamage x1.347 | baseline-v1:41.7% | 4/6 beaten | rejected |
| 38 | closing x0.7473, enemyDamage x1.1295 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 39 | closing x0.8298, enemyDamage x0.8429 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 40 | closing x0.8253, enemyDamage x0.9093 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 41 | closing x1.4195, enemyDamage x1.5836 | baseline-v1:29.2% | 3/6 beaten | rejected |
| 42 | closing x1.4084, enemyDamage x0.8883 | baseline-v1:54.2% | 5/6 beaten | rejected |
| 43 | closing x0.9289, enemyDamage x1.4753 | baseline-v1:16.7% | 3/6 beaten | rejected |
| 44 | closing x0.7721, enemyDamage x1.5472 | baseline-v1:12.5% | 3/6 beaten | rejected |
| 45 | closing x0.7121, enemyDamage x0.7595 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 46 | closing x1.1102, enemyDamage x1.3781 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 47 | closing x0.9253, enemyDamage x1.5813 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 48 | closing x1.0476, enemyDamage x0.7677 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 49 | closing x0.772, enemyDamage x1.4219 | baseline-v1:20.8% | 3/6 beaten | rejected |
| 50 | closing x1.1689, enemyDamage x1.073 | baseline-v1:37.5% | 4/6 beaten | rejected |

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-24, n=24

`baseline-v1` (party) vs. `random-baseline` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 95.8%
- random-baseline win rate: 4.2%
- Timeout rate: 0.0%
- Mean rounds to resolution: 7.5

Parallel tournament runner (worker_threads, concurrency=8): 1441ms vs. 1793ms sequential — 1.2x.

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-24, n=24

`baseline-v1` (party) vs. `worst-baseline` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 100.0%
- worst-baseline win rate: 0.0%
- Timeout rate: 0.0%
- Mean rounds to resolution: 5.7

Parallel tournament runner (worker_threads, concurrency=8): 1188ms vs. 1503ms sequential — 1.3x.

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-24, n=24

`baseline-v1` (party) vs. `nearest-only-baseline` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 100.0%
- nearest-only-baseline win rate: 0.0%
- Timeout rate: 0.0%
- Mean rounds to resolution: 5.6

Parallel tournament runner (worker_threads, concurrency=8): 1298ms vs. 1578ms sequential — 1.2x.

---
## 2026-09-02 — Roster generalization sweep

### Roster generalization sweep (design doc §54) — bennit.json+erabryth.json, seeds 1-24, n=24

`baseline-v1` (party) vs. every real archetype/anchor (opposition) — same mirror-match apparatus as every prior Archetype Ladder result, on a roster NONE of those prior results were ever measured against.

| Opponent | party win rate | opponent win rate | timeout | mean rounds |
|---|---|---|---|---|
| `aggressive-v1` | 54.2% | 45.8% | 0.0% | 4.8 |
| `cautious-v1` | 58.3% | 41.7% | 0.0% | 5.6 |
| `flanker-v1` | 62.5% | 37.5% | 0.0% | 5.7 |
| `brawler-v1` | 54.2% | 45.8% | 0.0% | 5.7 |
| `mindless-v1` | 83.3% | 16.7% | 0.0% | 4.8 |
| `zealot-v1` | 54.2% | 45.8% | 0.0% | 5.0 |
| `random-baseline` | 91.7% | 8.3% | 0.0% | 5.5 |
| `worst-baseline` | 100.0% | 0.0% | 0.0% | 6.8 |
| `nearest-only-baseline` | 75.0% | 25.0% | 0.0% | 4.4 |

---
## 2026-09-02 — Roster generalization sweep

### Roster generalization sweep (design doc §54) — tough.json+xenowarden-greenhorn.json, seeds 1-24, n=24

`baseline-v1` (party) vs. every real archetype/anchor (opposition) — same mirror-match apparatus as every prior Archetype Ladder result, on a roster NONE of those prior results were ever measured against.

| Opponent | party win rate | opponent win rate | timeout | mean rounds |
|---|---|---|---|---|
| `aggressive-v1` | 25.0% | 75.0% | 0.0% | 5.4 |
| `cautious-v1` | 62.5% | 37.5% | 0.0% | 6.1 |
| `flanker-v1` | 50.0% | 45.8% | 4.2% | 6.5 |
| `brawler-v1` | 41.7% | 58.3% | 0.0% | 7.5 |
| `mindless-v1` | 95.8% | 4.2% | 0.0% | 5.6 |
| `zealot-v1` | 33.3% | 66.7% | 0.0% | 5.6 |
| `random-baseline` | 95.8% | 4.2% | 0.0% | 5.8 |
| `worst-baseline` | 95.8% | 0.0% | 4.2% | 7.4 |
| `nearest-only-baseline` | 58.3% | 41.7% | 0.0% | 7.5 |

---
## 2026-09-02 — Roster generalization sweep

### Roster generalization sweep (design doc §54) — obozaya.json+kuriaku.json, seeds 1-24, n=24

`baseline-v1` (party) vs. every real archetype/anchor (opposition) — same mirror-match apparatus as every prior Archetype Ladder result, on a roster NONE of those prior results were ever measured against.

| Opponent | party win rate | opponent win rate | timeout | mean rounds |
|---|---|---|---|---|
| `aggressive-v1` | 62.5% | 37.5% | 0.0% | 7.4 |
| `cautious-v1` | 37.5% | 62.5% | 0.0% | 6.9 |
| `flanker-v1` | 54.2% | 45.8% | 0.0% | 7.4 |
| `brawler-v1` | 58.3% | 41.7% | 0.0% | 7.4 |
| `mindless-v1` | 70.8% | 29.2% | 0.0% | 7.1 |
| `zealot-v1` | 41.7% | 58.3% | 0.0% | 6.8 |
| `random-baseline` | 91.7% | 8.3% | 0.0% | 6.6 |
| `worst-baseline` | 100.0% | 0.0% | 0.0% | 7.2 |
| `nearest-only-baseline` | 70.8% | 29.2% | 0.0% | 7.0 |

---
## 2026-09-02 — Automated weight search

### Automated weight search (design doc §49) — tough.json+xenowarden-greenhorn.json, 1 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutation | League result | Archetype result | Verdict |
|---|---|---|---|---|
| 1 | lowHpCaution x0.6027 | baseline-v1:31.3% | 2/6 beaten | rejected |

---
## 2026-09-02 — Automated weight search

### Automated weight search (design doc §49) — obozaya.json+kuriaku.json, 1 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutation | League result | Archetype result | Verdict |
|---|---|---|---|---|
| 1 | lowHpCaution x0.6027 | baseline-v1:37.5% | 4/6 beaten | rejected |

---
## 2026-09-02 — Automated weight search

### Automated weight search (design doc §49) — tough.json+xenowarden-greenhorn.json, 3352 generations, 1-16 seeds/matchup

Starting profile: `baseline-v1`. League ended with 1 member(s): baseline-v1.
Final best: `baseline-v1` (no candidate was promoted — see per-generation log below).

| Gen | Mutation | League result | Archetype result | Verdict |
|---|---|---|---|---|
| 1 | lowHpCaution x0.6027 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2 | maneuverTempoDenial x1.5811 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3 | mobilityDenial x0.8811 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 4 | lowHpCaution x1.3207 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 5 | closing x1.5948 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 6 | closing x1.0888 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 7 | allyDamage x1.0037 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 8 | threatExposure x0.7545 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 9 | closing x0.6674 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 10 | offensiveReach x1.3671 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 11 | threatExposure x0.7909 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 12 | enemyDamage x1.0274 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 13 | maneuverTempoDenial x1.3987 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 14 | threatExposure x0.8055 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 15 | lowHpCaution x1.1461 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 16 | outnumberedCaution x0.7928 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 17 | outnumberedCaution x1.0541 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 18 | outnumberedCaution x1.5945 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 19 | threatExposure x1.357 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 20 | allyDamage x0.9233 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 21 | closing x0.8492 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 22 | allyDamage x1.3261 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 23 | maneuverTempoDenial x0.7272 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 24 | threatExposure x0.6487 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 25 | lowHpCaution x1.4658 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 26 | threatExposure x1.5894 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 27 | outnumberedCaution x1.0023 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 28 | offensiveReach x1.2772 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 29 | mobilityDenial x1.5233 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 30 | lowHpCaution x1.5189 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 31 | setupValue x1.5338 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 32 | allyDamage x0.6394 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 33 | setupValue x0.8945 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 34 | setupValue x1.1101 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 35 | mobilityDenial x1.3044 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 36 | allyDamage x1.2768 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 37 | mobilityDenial x0.7319 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 38 | mobilityDenial x0.763 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 39 | offensiveReach x0.7176 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 40 | closing x0.9243 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 41 | lowHpCaution x1.1091 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 42 | maneuverTempoDenial x0.6761 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 43 | setupValue x1.4542 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 44 | threatExposure x0.7643 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 45 | offensiveReach x1.494 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 46 | threatExposure x0.7437 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 47 | lowHpCaution x1.1491 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 48 | offensiveReach x0.7202 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 49 | allyDamage x0.6674 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 50 | offensiveReach x1.2756 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 51 | lowHpCaution x0.7168 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 52 | maneuverTempoDenial x1.1232 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 53 | threatExposure x1.3922 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 54 | threatExposure x1.5917 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 55 | mobilityDenial x1.47 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 56 | enemyDamage x0.783 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 57 | enemyDamage x1.5843 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 58 | offensiveReach x1.3207 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 59 | setupValue x0.6939 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 60 | threatExposure x1.4698 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 61 | outnumberedCaution x1.3918 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 62 | threatExposure x0.6963 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 63 | allyDamage x1.0087 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 64 | maneuverTempoDenial x0.8873 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 65 | setupValue x0.9122 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 66 | mobilityDenial x1.4618 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 67 | lowHpCaution x1.2691 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 68 | threatExposure x0.9836 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 69 | offensiveReach x0.8046 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 70 | threatExposure x1.531 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 71 | mobilityDenial x0.7599 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 72 | offensiveReach x0.6767 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 73 | enemyDamage x1.3836 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 74 | offensiveReach x0.8437 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 75 | allyDamage x1.4212 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 76 | offensiveReach x1.4924 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 77 | maneuverTempoDenial x1.0278 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 78 | lowHpCaution x0.9448 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 79 | threatExposure x1.136 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 80 | outnumberedCaution x1.3943 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 81 | enemyDamage x0.8086 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 82 | lowHpCaution x1.246 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 83 | enemyDamage x0.9263 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 84 | closing x1.4716 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 85 | lowHpCaution x0.9588 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 86 | offensiveReach x1.2013 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 87 | enemyDamage x1.5237 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 88 | maneuverTempoDenial x1.168 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 89 | lowHpCaution x0.7244 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 90 | enemyDamage x1.4142 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 91 | allyDamage x1.3106 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 92 | threatExposure x1.2415 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 93 | threatExposure x1.1456 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 94 | mobilityDenial x0.6721 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 95 | allyDamage x0.7733 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 96 | lowHpCaution x0.6454 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 97 | maneuverTempoDenial x0.9798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 98 | outnumberedCaution x0.863 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 99 | enemyDamage x1.5985 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 100 | mobilityDenial x0.6147 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 101 | setupValue x0.7123 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 102 | offensiveReach x1.2075 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 103 | maneuverTempoDenial x0.9845 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 104 | outnumberedCaution x0.7345 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 105 | threatExposure x1.5659 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 106 | lowHpCaution x1.1413 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 107 | enemyDamage x0.7636 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 108 | lowHpCaution x0.8373 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 109 | allyDamage x1.2401 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 110 | lowHpCaution x0.6192 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 111 | enemyDamage x0.6312 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 112 | closing x1.2766 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 113 | lowHpCaution x1.3984 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 114 | lowHpCaution x1.2741 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 115 | mobilityDenial x0.6225 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 116 | setupValue x1.5194 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 117 | enemyDamage x1.4236 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 118 | maneuverTempoDenial x1.1646 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 119 | offensiveReach x0.7073 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 120 | enemyDamage x1.2844 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 121 | offensiveReach x0.6149 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 122 | maneuverTempoDenial x1.1507 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 123 | lowHpCaution x1.4611 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 124 | closing x1.3671 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 125 | enemyDamage x0.9991 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 126 | outnumberedCaution x0.8034 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 127 | setupValue x1.3808 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 128 | enemyDamage x0.7838 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 129 | outnumberedCaution x0.6337 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 130 | setupValue x1.5573 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 131 | offensiveReach x1.5105 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 132 | setupValue x1.228 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 133 | closing x1.1985 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 134 | closing x0.8051 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 135 | allyDamage x1.5384 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 136 | lowHpCaution x0.6464 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 137 | maneuverTempoDenial x1.1913 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 138 | allyDamage x0.7534 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 139 | mobilityDenial x0.8729 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 140 | enemyDamage x1.095 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 141 | offensiveReach x1.5764 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 142 | lowHpCaution x1.0798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 143 | enemyDamage x1.2332 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 144 | enemyDamage x1.3856 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 145 | mobilityDenial x0.7792 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 146 | lowHpCaution x1.4858 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 147 | maneuverTempoDenial x1.1848 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 148 | closing x1.215 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 149 | maneuverTempoDenial x1.3845 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 150 | setupValue x0.9921 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 151 | outnumberedCaution x1.3154 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 152 | threatExposure x0.7594 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 153 | setupValue x0.9847 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 154 | mobilityDenial x1.1073 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 155 | lowHpCaution x1.0298 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 156 | allyDamage x1.3613 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 157 | lowHpCaution x1.3731 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 158 | allyDamage x0.6072 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 159 | outnumberedCaution x1.3804 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 160 | threatExposure x0.919 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 161 | outnumberedCaution x0.6341 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 162 | threatExposure x0.6537 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 163 | offensiveReach x1.537 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 164 | offensiveReach x1.0077 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 165 | lowHpCaution x0.7444 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 166 | lowHpCaution x1.3946 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 167 | lowHpCaution x1.0704 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 168 | allyDamage x1.0084 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 169 | mobilityDenial x1.064 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 170 | mobilityDenial x1.5967 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 171 | lowHpCaution x0.7976 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 172 | lowHpCaution x1.2199 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 173 | maneuverTempoDenial x1.508 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 174 | offensiveReach x1.5136 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 175 | enemyDamage x1.0497 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 176 | threatExposure x0.6136 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 177 | maneuverTempoDenial x1.0603 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 178 | outnumberedCaution x0.9078 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 179 | setupValue x1.5064 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 180 | closing x0.7874 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 181 | maneuverTempoDenial x1.1389 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 182 | offensiveReach x1.5614 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 183 | lowHpCaution x1.1152 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 184 | closing x0.6407 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 185 | closing x0.7945 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 186 | maneuverTempoDenial x0.6375 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 187 | maneuverTempoDenial x0.9408 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 188 | maneuverTempoDenial x0.8269 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 189 | allyDamage x0.8745 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 190 | offensiveReach x0.891 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 191 | lowHpCaution x1.1859 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 192 | enemyDamage x0.9895 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 193 | allyDamage x1.3815 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 194 | maneuverTempoDenial x0.8051 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 195 | closing x0.6047 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 196 | allyDamage x0.9545 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 197 | maneuverTempoDenial x1.5793 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 198 | offensiveReach x1.2084 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 199 | maneuverTempoDenial x1.004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 200 | offensiveReach x0.668 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 201 | lowHpCaution x1.2504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 202 | maneuverTempoDenial x0.6323 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 203 | offensiveReach x0.6834 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 204 | lowHpCaution x1.5879 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 205 | mobilityDenial x1.0846 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 206 | outnumberedCaution x1.0928 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 207 | enemyDamage x0.8584 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 208 | mobilityDenial x0.6494 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 209 | offensiveReach x1.4388 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 210 | setupValue x0.9945 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 211 | outnumberedCaution x1.4222 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 212 | lowHpCaution x0.7799 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 213 | enemyDamage x0.7791 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 214 | lowHpCaution x1.0842 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 215 | maneuverTempoDenial x1.0534 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 216 | offensiveReach x1.2285 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 217 | outnumberedCaution x1.4182 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 218 | enemyDamage x1.4764 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 219 | maneuverTempoDenial x0.9521 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 220 | setupValue x1.1115 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 221 | offensiveReach x0.9608 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 222 | setupValue x1.165 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 223 | setupValue x0.82 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 224 | setupValue x1.0147 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 225 | outnumberedCaution x0.7332 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 226 | threatExposure x0.9228 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 227 | lowHpCaution x0.9678 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 228 | maneuverTempoDenial x1.0697 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 229 | offensiveReach x1.309 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 230 | lowHpCaution x1.5818 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 231 | enemyDamage x1.5755 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 232 | threatExposure x0.6981 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 233 | offensiveReach x1.2643 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 234 | offensiveReach x1.1301 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 235 | offensiveReach x1.3079 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 236 | mobilityDenial x1.3456 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 237 | enemyDamage x0.9261 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 238 | threatExposure x0.7749 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 239 | maneuverTempoDenial x0.6535 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 240 | enemyDamage x0.9292 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 241 | closing x0.8817 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 242 | lowHpCaution x0.8283 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 243 | enemyDamage x1.2554 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 244 | maneuverTempoDenial x1.5766 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 245 | setupValue x0.988 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 246 | closing x1.1833 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 247 | lowHpCaution x0.6712 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 248 | lowHpCaution x0.9622 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 249 | threatExposure x1.3502 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 250 | setupValue x0.9336 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 251 | outnumberedCaution x1.4905 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 252 | mobilityDenial x1.446 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 253 | setupValue x1.0402 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 254 | closing x0.8178 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 255 | setupValue x1.336 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 256 | enemyDamage x0.8495 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 257 | setupValue x1.2255 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 258 | outnumberedCaution x0.6056 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 259 | lowHpCaution x1.1795 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 260 | enemyDamage x0.8278 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 261 | enemyDamage x1.3247 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 262 | enemyDamage x1.4906 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 263 | allyDamage x0.9838 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 264 | enemyDamage x1.2279 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 265 | lowHpCaution x1.4656 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 266 | mobilityDenial x0.673 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 267 | mobilityDenial x1.2496 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 268 | lowHpCaution x0.9141 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 269 | enemyDamage x1.41 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 270 | allyDamage x1.2826 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 271 | setupValue x0.8907 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 272 | closing x1.5526 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 273 | setupValue x0.7257 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 274 | outnumberedCaution x0.6903 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 275 | maneuverTempoDenial x0.9599 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 276 | allyDamage x0.6972 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 277 | allyDamage x1.0064 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 278 | maneuverTempoDenial x0.7379 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 279 | mobilityDenial x0.929 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 280 | enemyDamage x1.0415 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 281 | threatExposure x0.9443 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 282 | enemyDamage x1.2368 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 283 | mobilityDenial x1.5727 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 284 | threatExposure x1.3881 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 285 | maneuverTempoDenial x0.8474 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 286 | setupValue x0.6569 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 287 | enemyDamage x0.6623 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 288 | offensiveReach x1.4277 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 289 | lowHpCaution x0.8917 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 290 | offensiveReach x1.0476 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 291 | offensiveReach x1.1918 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 292 | closing x1.3428 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 293 | lowHpCaution x1.3122 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 294 | enemyDamage x1.0448 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 295 | closing x1.0222 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 296 | setupValue x1.3037 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 297 | threatExposure x1.5589 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 298 | outnumberedCaution x1.5099 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 299 | allyDamage x1.5748 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 300 | enemyDamage x1.0684 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 301 | allyDamage x1.2214 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 302 | enemyDamage x1.2118 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 303 | allyDamage x0.7236 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 304 | offensiveReach x1.0456 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 305 | threatExposure x1.2228 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 306 | enemyDamage x0.741 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 307 | threatExposure x1.289 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 308 | setupValue x1.0798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 309 | closing x1.5942 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 310 | outnumberedCaution x0.6718 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 311 | mobilityDenial x0.7177 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 312 | threatExposure x1.1373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 313 | maneuverTempoDenial x1.1938 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 314 | allyDamage x0.9622 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 315 | lowHpCaution x1.289 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 316 | offensiveReach x1.1248 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 317 | outnumberedCaution x1.5616 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 318 | lowHpCaution x1.5066 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 319 | outnumberedCaution x1.347 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 320 | offensiveReach x1.4795 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 321 | outnumberedCaution x1.0975 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 322 | offensiveReach x1.4042 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 323 | mobilityDenial x1.512 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 324 | enemyDamage x1.4428 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 325 | closing x0.9952 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 326 | allyDamage x1.0205 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 327 | closing x0.8254 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 328 | maneuverTempoDenial x1.5781 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 329 | maneuverTempoDenial x0.6403 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 330 | mobilityDenial x1.1357 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 331 | lowHpCaution x0.616 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 332 | outnumberedCaution x1.4117 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 333 | outnumberedCaution x1.5267 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 334 | setupValue x1.2654 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 335 | enemyDamage x1.2851 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 336 | closing x1.5629 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 337 | maneuverTempoDenial x1.2245 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 338 | allyDamage x1.3466 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 339 | allyDamage x1.1215 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 340 | threatExposure x0.8002 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 341 | offensiveReach x0.7022 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 342 | enemyDamage x1.0059 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 343 | enemyDamage x1.2352 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 344 | allyDamage x0.8974 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 345 | closing x1.46 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 346 | maneuverTempoDenial x1.5615 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 347 | offensiveReach x0.9733 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 348 | maneuverTempoDenial x0.8999 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 349 | offensiveReach x1.1839 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 350 | closing x1.0957 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 351 | allyDamage x0.876 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 352 | maneuverTempoDenial x0.6415 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 353 | allyDamage x0.8349 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 354 | lowHpCaution x0.9586 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 355 | enemyDamage x1.5347 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 356 | enemyDamage x0.6874 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 357 | setupValue x0.7818 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 358 | allyDamage x1.3403 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 359 | maneuverTempoDenial x1.3427 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 360 | threatExposure x1.2814 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 361 | offensiveReach x1.5566 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 362 | outnumberedCaution x0.8415 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 363 | threatExposure x0.9326 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 364 | threatExposure x1.2634 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 365 | enemyDamage x0.8543 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 366 | mobilityDenial x1.0341 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 367 | offensiveReach x1.2739 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 368 | outnumberedCaution x0.9029 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 369 | outnumberedCaution x1.5898 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 370 | lowHpCaution x0.6788 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 371 | lowHpCaution x0.8671 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 372 | closing x0.9856 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 373 | mobilityDenial x1.1069 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 374 | closing x1.5512 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 375 | enemyDamage x1.0044 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 376 | setupValue x1.5538 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 377 | enemyDamage x1.235 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 378 | threatExposure x1.5582 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 379 | allyDamage x0.6776 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 380 | maneuverTempoDenial x0.7191 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 381 | lowHpCaution x0.9071 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 382 | enemyDamage x0.9487 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 383 | offensiveReach x1.3493 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 384 | outnumberedCaution x1.1482 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 385 | outnumberedCaution x1.5929 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 386 | threatExposure x1.558 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 387 | closing x1.2556 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 388 | threatExposure x1.4019 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 389 | closing x1.3449 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 390 | lowHpCaution x1.2768 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 391 | setupValue x0.8667 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 392 | offensiveReach x0.9052 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 393 | outnumberedCaution x1.2406 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 394 | offensiveReach x1.4024 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 395 | lowHpCaution x0.6157 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 396 | lowHpCaution x1.59 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 397 | outnumberedCaution x0.9949 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 398 | allyDamage x1.3703 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 399 | offensiveReach x1.4291 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 400 | threatExposure x1.3708 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 401 | allyDamage x1.2796 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 402 | enemyDamage x0.9597 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 403 | threatExposure x1.0005 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 404 | outnumberedCaution x0.6881 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 405 | closing x1.0661 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 406 | threatExposure x1.3058 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 407 | threatExposure x1.576 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 408 | allyDamage x1.5039 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 409 | lowHpCaution x1.3906 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 410 | offensiveReach x0.9221 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 411 | allyDamage x0.9776 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 412 | setupValue x1.2515 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 413 | threatExposure x1.2519 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 414 | lowHpCaution x0.9715 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 415 | mobilityDenial x1.0404 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 416 | outnumberedCaution x1.477 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 417 | maneuverTempoDenial x1.292 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 418 | lowHpCaution x1.4482 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 419 | mobilityDenial x1.5149 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 420 | setupValue x1.2723 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 421 | closing x0.81 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 422 | threatExposure x1.4533 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 423 | allyDamage x0.8213 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 424 | maneuverTempoDenial x0.6177 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 425 | mobilityDenial x1.3605 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 426 | setupValue x1.1879 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 427 | threatExposure x1.5264 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 428 | allyDamage x1.2607 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 429 | enemyDamage x1.3227 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 430 | lowHpCaution x0.8661 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 431 | outnumberedCaution x1.1563 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 432 | setupValue x0.8783 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 433 | threatExposure x0.9536 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 434 | outnumberedCaution x1.2373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 435 | lowHpCaution x0.6211 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 436 | setupValue x1.4162 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 437 | threatExposure x1.2006 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 438 | allyDamage x0.7645 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 439 | offensiveReach x0.6929 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 440 | allyDamage x1.1855 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 441 | threatExposure x0.9972 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 442 | lowHpCaution x1.4888 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 443 | offensiveReach x1.5047 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 444 | closing x1.0933 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 445 | mobilityDenial x1.0125 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 446 | mobilityDenial x1.1308 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 447 | closing x0.6264 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 448 | offensiveReach x1.0718 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 449 | offensiveReach x1.1195 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 450 | lowHpCaution x1.5708 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 451 | offensiveReach x0.6016 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 452 | outnumberedCaution x0.6504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 453 | allyDamage x1.4737 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 454 | setupValue x1.4018 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 455 | lowHpCaution x1.5779 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 456 | enemyDamage x1.3347 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 457 | enemyDamage x0.7565 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 458 | maneuverTempoDenial x0.8295 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 459 | maneuverTempoDenial x1.4353 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 460 | offensiveReach x1.5594 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 461 | allyDamage x0.6154 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 462 | maneuverTempoDenial x1.2481 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 463 | lowHpCaution x0.9367 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 464 | enemyDamage x1.1645 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 465 | setupValue x1.4418 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 466 | closing x0.71 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 467 | allyDamage x0.6743 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 468 | maneuverTempoDenial x0.7239 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 469 | maneuverTempoDenial x1.1143 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 470 | outnumberedCaution x0.791 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 471 | setupValue x0.941 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 472 | maneuverTempoDenial x1.0031 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 473 | offensiveReach x1.5148 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 474 | offensiveReach x1.0324 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 475 | closing x1.4277 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 476 | setupValue x1.3449 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 477 | setupValue x0.9045 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 478 | setupValue x1.4551 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 479 | lowHpCaution x0.7129 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 480 | enemyDamage x1.4342 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 481 | maneuverTempoDenial x1.4128 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 482 | outnumberedCaution x1.0805 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 483 | maneuverTempoDenial x1.4939 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 484 | offensiveReach x1.0661 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 485 | allyDamage x1.0218 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 486 | maneuverTempoDenial x1.1138 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 487 | threatExposure x0.9872 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 488 | closing x1.5307 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 489 | offensiveReach x1.1696 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 490 | lowHpCaution x0.6646 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 491 | setupValue x1.4887 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 492 | closing x1.5221 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 493 | enemyDamage x0.9545 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 494 | mobilityDenial x1.427 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 495 | threatExposure x1.3547 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 496 | closing x1.2017 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 497 | allyDamage x1.2563 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 498 | threatExposure x1.112 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 499 | threatExposure x0.8464 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 500 | maneuverTempoDenial x0.7237 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 501 | threatExposure x0.7601 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 502 | setupValue x0.7348 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 503 | outnumberedCaution x1.374 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 504 | allyDamage x0.8244 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 505 | mobilityDenial x0.6504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 506 | outnumberedCaution x0.9205 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 507 | outnumberedCaution x0.9038 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 508 | maneuverTempoDenial x1.0239 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 509 | offensiveReach x1.1596 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 510 | maneuverTempoDenial x1.0564 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 511 | allyDamage x0.8143 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 512 | setupValue x1.1648 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 513 | mobilityDenial x1.4247 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 514 | offensiveReach x1.2588 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 515 | allyDamage x1.4968 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 516 | enemyDamage x0.7199 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 517 | enemyDamage x1.3837 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 518 | closing x1.5974 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 519 | lowHpCaution x0.918 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 520 | threatExposure x1.2494 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 521 | closing x1.4172 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 522 | setupValue x1.412 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 523 | outnumberedCaution x1.4419 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 524 | lowHpCaution x0.6218 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 525 | mobilityDenial x1.4614 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 526 | closing x0.9921 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 527 | enemyDamage x1.3308 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 528 | enemyDamage x1.3047 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 529 | outnumberedCaution x1.4077 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 530 | outnumberedCaution x1.0148 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 531 | offensiveReach x1.4492 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 532 | mobilityDenial x1.3374 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 533 | threatExposure x0.8034 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 534 | enemyDamage x0.6442 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 535 | mobilityDenial x0.9206 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 536 | offensiveReach x0.8182 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 537 | offensiveReach x0.7498 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 538 | setupValue x0.8666 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 539 | outnumberedCaution x1.5432 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 540 | offensiveReach x1.3688 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 541 | allyDamage x1.1344 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 542 | maneuverTempoDenial x1.5192 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 543 | offensiveReach x1.2199 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 544 | allyDamage x1.5019 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 545 | closing x0.6702 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 546 | mobilityDenial x1.1567 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 547 | outnumberedCaution x1.2404 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 548 | setupValue x1.4652 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 549 | lowHpCaution x1.222 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 550 | mobilityDenial x1.5252 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 551 | threatExposure x0.7256 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 552 | allyDamage x1.581 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 553 | setupValue x1.2099 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 554 | outnumberedCaution x1.1894 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 555 | closing x1.0227 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 556 | outnumberedCaution x0.9798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 557 | lowHpCaution x1.0072 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 558 | threatExposure x1.1777 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 559 | lowHpCaution x1.5658 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 560 | lowHpCaution x1.4179 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 561 | outnumberedCaution x1.2523 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 562 | allyDamage x1.4909 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 563 | offensiveReach x1.3601 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 564 | enemyDamage x1.3832 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 565 | allyDamage x0.7823 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 566 | maneuverTempoDenial x1.2069 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 567 | offensiveReach x1.3415 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 568 | lowHpCaution x0.9273 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 569 | threatExposure x1.0954 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 570 | closing x0.853 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 571 | maneuverTempoDenial x0.6351 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 572 | threatExposure x1.3111 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 573 | maneuverTempoDenial x0.7276 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 574 | threatExposure x0.7331 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 575 | outnumberedCaution x1.3952 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 576 | closing x0.7678 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 577 | mobilityDenial x0.9468 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 578 | lowHpCaution x1.3463 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 579 | enemyDamage x0.8949 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 580 | allyDamage x0.9524 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 581 | closing x0.7527 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 582 | closing x0.9731 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 583 | threatExposure x0.7394 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 584 | mobilityDenial x1.5365 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 585 | offensiveReach x1.5327 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 586 | closing x1.0795 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 587 | mobilityDenial x1.0459 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 588 | setupValue x1.1701 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 589 | lowHpCaution x0.8336 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 590 | lowHpCaution x1.5497 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 591 | allyDamage x1.1954 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 592 | threatExposure x0.7234 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 593 | outnumberedCaution x1.0474 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 594 | enemyDamage x1.3406 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 595 | offensiveReach x0.9035 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 596 | lowHpCaution x1.4937 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 597 | allyDamage x1.3673 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 598 | outnumberedCaution x0.8834 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 599 | closing x1.0377 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 600 | allyDamage x1.1976 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 601 | closing x1.5648 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 602 | offensiveReach x1.308 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 603 | offensiveReach x1.182 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 604 | enemyDamage x1.504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 605 | lowHpCaution x1.0365 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 606 | lowHpCaution x1.0412 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 607 | enemyDamage x1.2338 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 608 | enemyDamage x1.3674 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 609 | allyDamage x0.6164 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 610 | enemyDamage x0.6816 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 611 | lowHpCaution x0.7214 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 612 | maneuverTempoDenial x1.4484 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 613 | closing x1.0023 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 614 | outnumberedCaution x0.7365 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 615 | offensiveReach x1.4922 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 616 | mobilityDenial x1.1791 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 617 | lowHpCaution x1.386 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 618 | closing x0.6409 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 619 | mobilityDenial x1.3955 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 620 | outnumberedCaution x1.0275 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 621 | closing x1.4128 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 622 | closing x1.4916 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 623 | offensiveReach x0.7003 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 624 | enemyDamage x0.7461 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 625 | threatExposure x0.7881 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 626 | setupValue x1.0485 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 627 | closing x1.1046 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 628 | enemyDamage x0.9963 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 629 | mobilityDenial x0.9088 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 630 | outnumberedCaution x0.9044 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 631 | outnumberedCaution x1.0877 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 632 | lowHpCaution x1.1243 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 633 | allyDamage x0.6897 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 634 | setupValue x1.341 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 635 | setupValue x1.3635 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 636 | mobilityDenial x0.7115 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 637 | closing x0.6555 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 638 | mobilityDenial x1.0937 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 639 | enemyDamage x1.5492 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 640 | mobilityDenial x0.9557 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 641 | lowHpCaution x1.1311 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 642 | offensiveReach x1.0971 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 643 | maneuverTempoDenial x1.1223 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 644 | closing x1.3324 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 645 | lowHpCaution x0.7187 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 646 | mobilityDenial x1.3155 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 647 | offensiveReach x0.7395 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 648 | mobilityDenial x1.0691 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 649 | enemyDamage x1.0042 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 650 | offensiveReach x0.9848 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 651 | allyDamage x1.0062 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 652 | allyDamage x1.2754 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 653 | threatExposure x0.9217 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 654 | maneuverTempoDenial x1.5465 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 655 | lowHpCaution x1.0642 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 656 | outnumberedCaution x0.9512 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 657 | mobilityDenial x1.392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 658 | maneuverTempoDenial x1.0477 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 659 | closing x1.3978 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 660 | lowHpCaution x0.9351 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 661 | outnumberedCaution x1.2525 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 662 | threatExposure x1.2577 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 663 | lowHpCaution x0.9058 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 664 | threatExposure x1.0357 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 665 | setupValue x0.6604 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 666 | mobilityDenial x1.4538 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 667 | threatExposure x1.0077 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 668 | closing x1.2412 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 669 | setupValue x1.0825 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 670 | threatExposure x1.0921 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 671 | lowHpCaution x1.0353 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 672 | outnumberedCaution x1.4195 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 673 | offensiveReach x1.4114 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 674 | outnumberedCaution x0.7647 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 675 | mobilityDenial x0.8633 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 676 | outnumberedCaution x0.9646 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 677 | threatExposure x1.5546 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 678 | setupValue x0.8237 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 679 | threatExposure x1.1654 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 680 | offensiveReach x1.0136 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 681 | enemyDamage x1.1392 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 682 | allyDamage x0.6792 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 683 | allyDamage x0.8539 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 684 | maneuverTempoDenial x1.5023 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 685 | outnumberedCaution x1.5394 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 686 | allyDamage x0.6812 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 687 | closing x1.3165 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 688 | closing x0.886 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 689 | offensiveReach x1.5005 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 690 | enemyDamage x1.1651 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 691 | enemyDamage x0.9679 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 692 | lowHpCaution x1.2303 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 693 | maneuverTempoDenial x0.9266 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 694 | enemyDamage x0.6749 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 695 | allyDamage x1.2199 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 696 | outnumberedCaution x0.6707 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 697 | mobilityDenial x0.7011 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 698 | allyDamage x0.9914 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 699 | offensiveReach x1.1776 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 700 | offensiveReach x0.906 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 701 | offensiveReach x1.4494 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 702 | closing x1.262 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 703 | outnumberedCaution x1.2857 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 704 | closing x1.2366 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 705 | lowHpCaution x1.3953 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 706 | mobilityDenial x1.367 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 707 | lowHpCaution x1.2099 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 708 | outnumberedCaution x0.6254 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 709 | enemyDamage x1.4353 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 710 | lowHpCaution x1.5153 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 711 | enemyDamage x0.6518 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 712 | setupValue x1.5791 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 713 | mobilityDenial x1.4006 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 714 | mobilityDenial x0.8405 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 715 | maneuverTempoDenial x1.2225 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 716 | offensiveReach x1.4364 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 717 | closing x1.3813 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 718 | lowHpCaution x0.6872 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 719 | maneuverTempoDenial x1.2744 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 720 | mobilityDenial x0.7292 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 721 | lowHpCaution x0.7762 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 722 | outnumberedCaution x1.2679 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 723 | outnumberedCaution x1.0987 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 724 | offensiveReach x1.3484 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 725 | allyDamage x0.9258 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 726 | enemyDamage x1.2158 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 727 | allyDamage x1.4792 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 728 | threatExposure x1.1535 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 729 | threatExposure x1.3864 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 730 | allyDamage x1.107 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 731 | closing x0.9247 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 732 | allyDamage x0.6623 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 733 | closing x1.025 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 734 | lowHpCaution x0.9018 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 735 | offensiveReach x1.5599 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 736 | outnumberedCaution x1.3965 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 737 | maneuverTempoDenial x1.5213 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 738 | lowHpCaution x1.3317 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 739 | offensiveReach x1.5598 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 740 | maneuverTempoDenial x1.3984 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 741 | setupValue x0.755 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 742 | threatExposure x1.205 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 743 | threatExposure x1.0468 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 744 | mobilityDenial x1.1014 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 745 | outnumberedCaution x1.2813 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 746 | lowHpCaution x0.867 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 747 | maneuverTempoDenial x1.1889 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 748 | mobilityDenial x0.6585 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 749 | enemyDamage x0.9543 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 750 | setupValue x1.5023 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 751 | threatExposure x0.735 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 752 | mobilityDenial x1.0513 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 753 | enemyDamage x0.9021 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 754 | maneuverTempoDenial x1.4672 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 755 | offensiveReach x1.3511 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 756 | enemyDamage x1.1422 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 757 | enemyDamage x1.0763 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 758 | offensiveReach x0.7753 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 759 | allyDamage x1.3562 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 760 | closing x0.7656 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 761 | threatExposure x1.2457 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 762 | offensiveReach x1.2794 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 763 | enemyDamage x0.8831 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 764 | threatExposure x1.4201 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 765 | maneuverTempoDenial x1.3024 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 766 | lowHpCaution x0.6966 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 767 | lowHpCaution x1.4703 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 768 | mobilityDenial x1.227 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 769 | closing x0.9364 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 770 | maneuverTempoDenial x0.6181 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 771 | lowHpCaution x0.6408 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 772 | enemyDamage x1.4417 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 773 | lowHpCaution x0.8708 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 774 | outnumberedCaution x0.6994 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 775 | outnumberedCaution x1.5521 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 776 | outnumberedCaution x1.0632 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 777 | outnumberedCaution x1.4631 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 778 | lowHpCaution x1.3419 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 779 | threatExposure x1.084 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 780 | setupValue x1.2088 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 781 | offensiveReach x0.8574 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 782 | closing x0.8938 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 783 | closing x1.4504 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 784 | setupValue x0.6811 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 785 | maneuverTempoDenial x1.4384 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 786 | allyDamage x0.6158 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 787 | threatExposure x1.0933 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 788 | offensiveReach x1.5375 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 789 | enemyDamage x1.5116 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 790 | allyDamage x1.1901 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 791 | setupValue x1.2318 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 792 | threatExposure x1.3991 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 793 | setupValue x1.497 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 794 | enemyDamage x1.1272 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 795 | closing x0.6941 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 796 | offensiveReach x1.4029 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 797 | threatExposure x0.8237 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 798 | allyDamage x0.942 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 799 | mobilityDenial x1.0236 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 800 | maneuverTempoDenial x1.1189 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 801 | lowHpCaution x1.1582 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 802 | threatExposure x1.1915 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 803 | offensiveReach x0.6437 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 804 | offensiveReach x0.8345 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 805 | threatExposure x0.7785 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 806 | maneuverTempoDenial x1.4314 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 807 | allyDamage x1.1453 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 808 | maneuverTempoDenial x1.5324 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 809 | mobilityDenial x1.1497 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 810 | lowHpCaution x0.6181 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 811 | outnumberedCaution x1.508 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 812 | lowHpCaution x1.5842 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 813 | setupValue x0.708 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 814 | setupValue x0.7745 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 815 | lowHpCaution x1.3147 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 816 | maneuverTempoDenial x1.2465 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 817 | lowHpCaution x1.5438 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 818 | enemyDamage x0.9214 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 819 | enemyDamage x0.9346 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 820 | threatExposure x1.0362 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 821 | maneuverTempoDenial x0.6056 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 822 | allyDamage x1.0245 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 823 | closing x0.9781 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 824 | maneuverTempoDenial x1.1994 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 825 | setupValue x0.6007 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 826 | lowHpCaution x0.6743 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 827 | outnumberedCaution x1.5876 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 828 | offensiveReach x1.0757 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 829 | enemyDamage x1.1594 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 830 | allyDamage x0.6306 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 831 | mobilityDenial x0.833 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 832 | lowHpCaution x1.4441 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 833 | enemyDamage x1.5919 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 834 | offensiveReach x0.6338 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 835 | offensiveReach x0.7327 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 836 | outnumberedCaution x0.6223 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 837 | lowHpCaution x1.1236 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 838 | threatExposure x1.4359 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 839 | closing x0.6286 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 840 | maneuverTempoDenial x1.4432 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 841 | closing x1.1238 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 842 | outnumberedCaution x0.6345 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 843 | outnumberedCaution x0.798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 844 | closing x0.9849 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 845 | allyDamage x0.9481 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 846 | setupValue x1.2214 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 847 | offensiveReach x0.9909 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 848 | allyDamage x1.0046 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 849 | setupValue x0.8515 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 850 | mobilityDenial x0.6594 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 851 | setupValue x1.2356 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 852 | allyDamage x0.6343 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 853 | mobilityDenial x0.6109 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 854 | lowHpCaution x1.3392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 855 | lowHpCaution x1.5268 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 856 | lowHpCaution x0.6652 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 857 | offensiveReach x1.3901 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 858 | lowHpCaution x0.7795 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 859 | allyDamage x0.6779 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 860 | threatExposure x0.9347 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 861 | offensiveReach x0.993 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 862 | closing x0.8464 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 863 | threatExposure x1.3232 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 864 | outnumberedCaution x1.5858 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 865 | maneuverTempoDenial x1.0771 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 866 | maneuverTempoDenial x0.8405 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 867 | threatExposure x0.9232 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 868 | allyDamage x1.1989 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 869 | allyDamage x1.3301 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 870 | outnumberedCaution x0.7109 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 871 | lowHpCaution x1.4072 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 872 | lowHpCaution x0.6679 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 873 | lowHpCaution x0.9021 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 874 | threatExposure x1.0417 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 875 | setupValue x0.9271 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 876 | outnumberedCaution x1.0073 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 877 | offensiveReach x0.8163 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 878 | enemyDamage x1.091 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 879 | offensiveReach x0.7153 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 880 | mobilityDenial x1.2261 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 881 | mobilityDenial x0.9191 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 882 | maneuverTempoDenial x1.293 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 883 | outnumberedCaution x0.6408 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 884 | closing x1.3213 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 885 | setupValue x0.7818 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 886 | outnumberedCaution x0.6516 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 887 | outnumberedCaution x0.7248 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 888 | offensiveReach x1.2509 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 889 | maneuverTempoDenial x1.1201 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 890 | setupValue x1.5297 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 891 | offensiveReach x1.3729 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 892 | enemyDamage x1.0311 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 893 | mobilityDenial x0.7744 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 894 | allyDamage x0.7929 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 895 | closing x1.2746 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 896 | setupValue x0.668 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 897 | offensiveReach x1.4472 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 898 | mobilityDenial x1.0702 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 899 | setupValue x1.2689 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 900 | outnumberedCaution x0.8185 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 901 | mobilityDenial x0.6218 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 902 | outnumberedCaution x1.1485 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 903 | threatExposure x0.6259 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 904 | setupValue x1.5118 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 905 | maneuverTempoDenial x0.8058 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 906 | maneuverTempoDenial x1.1645 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 907 | threatExposure x1.2452 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 908 | maneuverTempoDenial x1.1477 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 909 | allyDamage x0.9049 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 910 | closing x0.6546 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 911 | offensiveReach x1.0561 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 912 | allyDamage x1.1849 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 913 | outnumberedCaution x0.8027 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 914 | allyDamage x1.415 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 915 | setupValue x1.3372 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 916 | maneuverTempoDenial x0.9384 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 917 | enemyDamage x1.4767 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 918 | setupValue x0.8691 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 919 | lowHpCaution x1.0032 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 920 | offensiveReach x1.4687 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 921 | mobilityDenial x1.4803 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 922 | closing x1.0143 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 923 | mobilityDenial x1.3703 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 924 | closing x0.7714 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 925 | enemyDamage x1.5332 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 926 | setupValue x0.9744 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 927 | lowHpCaution x1.1112 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 928 | offensiveReach x1.3087 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 929 | allyDamage x0.8591 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 930 | setupValue x1.4641 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 931 | mobilityDenial x1.3083 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 932 | enemyDamage x0.7534 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 933 | threatExposure x0.805 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 934 | mobilityDenial x0.6642 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 935 | maneuverTempoDenial x1.0279 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 936 | closing x1.0969 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 937 | offensiveReach x0.6793 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 938 | enemyDamage x1.2639 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 939 | outnumberedCaution x0.77 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 940 | outnumberedCaution x1.1804 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 941 | allyDamage x0.6394 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 942 | closing x0.9988 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 943 | threatExposure x0.7876 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 944 | outnumberedCaution x0.9772 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 945 | threatExposure x1.0548 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 946 | enemyDamage x0.8363 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 947 | outnumberedCaution x0.8771 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 948 | mobilityDenial x1.183 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 949 | threatExposure x1.1915 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 950 | outnumberedCaution x0.7584 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 951 | maneuverTempoDenial x1.5097 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 952 | outnumberedCaution x0.8877 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 953 | maneuverTempoDenial x1.4648 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 954 | allyDamage x1.0846 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 955 | enemyDamage x1.4299 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 956 | outnumberedCaution x1.3436 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 957 | offensiveReach x1.2843 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 958 | lowHpCaution x1.1042 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 959 | threatExposure x1.2066 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 960 | outnumberedCaution x0.6251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 961 | lowHpCaution x0.6331 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 962 | mobilityDenial x1.2973 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 963 | maneuverTempoDenial x1.5564 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 964 | outnumberedCaution x1.4542 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 965 | maneuverTempoDenial x1.4583 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 966 | closing x0.785 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 967 | lowHpCaution x0.8354 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 968 | mobilityDenial x0.6168 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 969 | enemyDamage x0.8122 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 970 | outnumberedCaution x0.8195 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 971 | mobilityDenial x0.8214 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 972 | threatExposure x1.008 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 973 | maneuverTempoDenial x1.4825 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 974 | maneuverTempoDenial x1.1561 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 975 | lowHpCaution x0.6422 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 976 | enemyDamage x1.103 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 977 | maneuverTempoDenial x0.8832 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 978 | offensiveReach x1.2036 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 979 | lowHpCaution x0.8216 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 980 | allyDamage x1.3325 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 981 | outnumberedCaution x0.8623 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 982 | enemyDamage x1.5463 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 983 | threatExposure x1.2513 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 984 | setupValue x0.6735 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 985 | closing x1.3066 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 986 | setupValue x1.4221 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 987 | closing x1.0483 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 988 | allyDamage x0.7722 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 989 | setupValue x1.0879 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 990 | closing x1.4124 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 991 | allyDamage x1.4261 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 992 | closing x1.3906 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 993 | outnumberedCaution x0.7011 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 994 | closing x0.6135 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 995 | enemyDamage x0.9282 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 996 | allyDamage x1.2218 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 997 | setupValue x1.5835 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 998 | threatExposure x1.0078 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 999 | setupValue x0.6654 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1000 | threatExposure x1.1998 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1001 | allyDamage x1.0522 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1002 | maneuverTempoDenial x0.8112 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1003 | setupValue x1.1277 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1004 | mobilityDenial x1.2487 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1005 | closing x1.0617 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1006 | enemyDamage x0.9797 | baseline-v1:50.0% | 3/6 beaten | rejected |
| 1007 | allyDamage x1.5004 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1008 | closing x0.8397 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1009 | lowHpCaution x1.1603 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1010 | outnumberedCaution x0.8387 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1011 | offensiveReach x1.2713 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1012 | mobilityDenial x0.7371 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1013 | mobilityDenial x1.3624 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1014 | offensiveReach x1.1511 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1015 | enemyDamage x1.3575 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1016 | maneuverTempoDenial x1.0938 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1017 | maneuverTempoDenial x1.0545 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1018 | offensiveReach x0.9388 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1019 | lowHpCaution x0.6921 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1020 | enemyDamage x1.2194 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1021 | enemyDamage x1.3438 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1022 | enemyDamage x1.4609 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1023 | threatExposure x0.7184 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1024 | outnumberedCaution x1.367 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1025 | mobilityDenial x1.4811 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1026 | lowHpCaution x0.6255 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1027 | allyDamage x0.6079 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1028 | setupValue x1.4034 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1029 | mobilityDenial x1.1193 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1030 | offensiveReach x1.4524 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1031 | offensiveReach x0.8395 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1032 | allyDamage x1.4271 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1033 | threatExposure x1.2445 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1034 | setupValue x0.6832 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1035 | offensiveReach x1.5459 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1036 | setupValue x0.6202 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1037 | threatExposure x0.6774 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1038 | threatExposure x1.0225 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1039 | threatExposure x0.847 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1040 | mobilityDenial x1.4106 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1041 | setupValue x0.9503 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1042 | closing x1.1231 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1043 | setupValue x0.9507 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1044 | lowHpCaution x1.5549 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1045 | lowHpCaution x1.5906 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1046 | closing x1.0498 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1047 | allyDamage x1.4048 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1048 | setupValue x1.2489 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1049 | allyDamage x0.6955 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1050 | setupValue x1.0911 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1051 | setupValue x0.8009 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1052 | maneuverTempoDenial x1.2627 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1053 | mobilityDenial x1.5751 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1054 | outnumberedCaution x1.3225 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1055 | closing x1.1351 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1056 | maneuverTempoDenial x1.0511 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1057 | allyDamage x0.9307 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1058 | closing x0.6832 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1059 | allyDamage x0.8287 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1060 | offensiveReach x1.1909 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1061 | threatExposure x0.8447 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1062 | closing x0.7865 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1063 | setupValue x0.8133 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1064 | enemyDamage x1.5251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1065 | maneuverTempoDenial x0.9333 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1066 | allyDamage x1.1343 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1067 | outnumberedCaution x1.2979 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1068 | offensiveReach x0.6529 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1069 | setupValue x1.4488 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1070 | maneuverTempoDenial x0.6897 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1071 | offensiveReach x1.3549 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1072 | lowHpCaution x1.2393 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1073 | allyDamage x1.307 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1074 | threatExposure x1.5024 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1075 | offensiveReach x0.9263 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1076 | allyDamage x0.8293 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1077 | threatExposure x1.5761 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1078 | maneuverTempoDenial x0.7139 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1079 | closing x1.2595 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1080 | maneuverTempoDenial x0.863 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1081 | allyDamage x1.159 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1082 | maneuverTempoDenial x1.521 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1083 | maneuverTempoDenial x1.2549 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1084 | allyDamage x0.8557 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1085 | closing x1.0623 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1086 | enemyDamage x0.65 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1087 | enemyDamage x0.6695 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1088 | allyDamage x1.3731 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1089 | maneuverTempoDenial x1.2032 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1090 | mobilityDenial x0.6373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1091 | maneuverTempoDenial x1.468 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1092 | mobilityDenial x1.476 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1093 | mobilityDenial x0.9449 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1094 | outnumberedCaution x0.7251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1095 | closing x1.2752 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1096 | allyDamage x0.8238 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1097 | offensiveReach x1.1325 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1098 | lowHpCaution x1.5775 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1099 | enemyDamage x1.1613 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1100 | offensiveReach x1.3837 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1101 | lowHpCaution x0.8749 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1102 | threatExposure x0.9501 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1103 | offensiveReach x1.3478 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1104 | outnumberedCaution x0.7941 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1105 | lowHpCaution x0.6388 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1106 | allyDamage x1.5624 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1107 | maneuverTempoDenial x0.781 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1108 | closing x0.9726 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1109 | mobilityDenial x0.6296 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1110 | maneuverTempoDenial x1.2932 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1111 | threatExposure x1.1079 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1112 | outnumberedCaution x1.0657 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1113 | allyDamage x1.0105 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1114 | lowHpCaution x1.4223 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1115 | offensiveReach x1.1187 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1116 | lowHpCaution x1.4505 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1117 | lowHpCaution x0.993 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1118 | offensiveReach x1.1114 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1119 | threatExposure x1.5032 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1120 | lowHpCaution x0.6713 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1121 | enemyDamage x0.6208 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 1122 | mobilityDenial x1.3754 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1123 | offensiveReach x1.4277 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1124 | threatExposure x1.5353 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1125 | setupValue x1.1837 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1126 | maneuverTempoDenial x0.8124 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1127 | outnumberedCaution x0.8742 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1128 | threatExposure x1.4954 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1129 | outnumberedCaution x1.1773 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1130 | setupValue x1.0062 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1131 | enemyDamage x1.2377 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1132 | outnumberedCaution x1.0392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1133 | allyDamage x0.6364 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1134 | offensiveReach x0.7073 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1135 | offensiveReach x1.0219 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1136 | lowHpCaution x1.5962 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1137 | mobilityDenial x1.1002 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1138 | allyDamage x1.5854 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1139 | setupValue x1.2313 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1140 | allyDamage x1.1288 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1141 | lowHpCaution x1.2148 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1142 | lowHpCaution x1.3861 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1143 | allyDamage x0.9808 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1144 | lowHpCaution x1.2013 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1145 | maneuverTempoDenial x1.0109 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1146 | mobilityDenial x1.187 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1147 | closing x1.0062 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1148 | mobilityDenial x0.7318 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1149 | maneuverTempoDenial x0.8014 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1150 | allyDamage x1.5741 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1151 | enemyDamage x1.0068 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1152 | setupValue x0.8688 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1153 | maneuverTempoDenial x1.5234 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1154 | enemyDamage x0.9758 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1155 | mobilityDenial x1.1094 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1156 | mobilityDenial x0.7432 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1157 | outnumberedCaution x1.5265 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1158 | threatExposure x1.0345 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1159 | offensiveReach x1.5233 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1160 | closing x0.8312 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1161 | threatExposure x0.6843 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1162 | closing x0.93 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1163 | allyDamage x1.0174 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1164 | enemyDamage x1.3291 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1165 | threatExposure x1.0921 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1166 | setupValue x1.0914 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1167 | setupValue x1.5921 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1168 | offensiveReach x0.9692 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1169 | mobilityDenial x0.8096 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1170 | maneuverTempoDenial x1.0703 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1171 | allyDamage x1.5859 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1172 | lowHpCaution x1.4125 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1173 | lowHpCaution x1.3972 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1174 | mobilityDenial x0.8325 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1175 | allyDamage x0.769 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1176 | outnumberedCaution x0.9502 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1177 | outnumberedCaution x1.0242 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1178 | enemyDamage x0.7259 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1179 | closing x0.849 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1180 | outnumberedCaution x1.3709 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1181 | enemyDamage x0.6339 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1182 | setupValue x0.9985 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1183 | outnumberedCaution x1.5621 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1184 | lowHpCaution x0.6978 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1185 | threatExposure x1.3697 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1186 | allyDamage x1.5822 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1187 | outnumberedCaution x1.153 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1188 | mobilityDenial x1.2736 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1189 | threatExposure x0.9546 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1190 | allyDamage x1.3749 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1191 | closing x1.1299 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1192 | allyDamage x0.6227 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1193 | maneuverTempoDenial x0.8052 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1194 | outnumberedCaution x0.8464 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1195 | maneuverTempoDenial x0.8448 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1196 | offensiveReach x1.4494 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1197 | lowHpCaution x1.106 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1198 | lowHpCaution x1.439 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1199 | mobilityDenial x1.4298 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1200 | maneuverTempoDenial x0.9756 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1201 | allyDamage x1.3786 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1202 | closing x1.228 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1203 | lowHpCaution x1.2935 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1204 | outnumberedCaution x1.3814 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1205 | lowHpCaution x0.8291 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1206 | enemyDamage x0.6464 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1207 | offensiveReach x0.9168 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1208 | closing x0.6767 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1209 | allyDamage x1.2004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1210 | setupValue x1.1739 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1211 | threatExposure x1.5092 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1212 | offensiveReach x0.9745 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1213 | offensiveReach x1.0365 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1214 | allyDamage x0.9634 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1215 | maneuverTempoDenial x0.9177 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1216 | offensiveReach x1.3885 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1217 | outnumberedCaution x0.6571 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1218 | enemyDamage x0.7076 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1219 | maneuverTempoDenial x0.9251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1220 | mobilityDenial x1.0776 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1221 | maneuverTempoDenial x1.3233 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1222 | enemyDamage x0.9759 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1223 | offensiveReach x0.7195 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1224 | enemyDamage x0.9756 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1225 | allyDamage x1.4372 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1226 | allyDamage x0.8057 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1227 | mobilityDenial x1.3778 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1228 | lowHpCaution x1.4595 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1229 | mobilityDenial x1.3003 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1230 | lowHpCaution x1.2484 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1231 | mobilityDenial x1.2242 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1232 | threatExposure x1.4374 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1233 | enemyDamage x1.4833 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1234 | outnumberedCaution x0.8897 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1235 | outnumberedCaution x0.9374 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1236 | closing x1.2234 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1237 | lowHpCaution x0.6127 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1238 | threatExposure x1.3005 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1239 | closing x1.2819 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1240 | lowHpCaution x1.4871 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1241 | maneuverTempoDenial x1.0629 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1242 | closing x0.9757 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1243 | threatExposure x1.0184 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1244 | outnumberedCaution x1.3593 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1245 | allyDamage x1.148 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1246 | lowHpCaution x0.7084 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1247 | maneuverTempoDenial x0.6126 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1248 | allyDamage x0.955 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1249 | threatExposure x1.189 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1250 | lowHpCaution x0.7967 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1251 | closing x1.4643 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1252 | threatExposure x1.1351 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1253 | setupValue x1.2456 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1254 | enemyDamage x1.1617 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1255 | setupValue x0.9326 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1256 | allyDamage x0.673 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1257 | maneuverTempoDenial x0.756 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1258 | setupValue x1.3556 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1259 | setupValue x1.5312 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1260 | mobilityDenial x1.158 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1261 | mobilityDenial x1.0346 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1262 | lowHpCaution x1.49 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1263 | allyDamage x0.7895 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1264 | setupValue x0.9004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1265 | allyDamage x0.6501 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1266 | offensiveReach x0.7245 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1267 | setupValue x1.2578 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1268 | mobilityDenial x0.6503 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1269 | maneuverTempoDenial x1.3335 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1270 | offensiveReach x1.3742 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1271 | enemyDamage x0.8415 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1272 | maneuverTempoDenial x0.8557 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1273 | mobilityDenial x1.4863 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1274 | threatExposure x0.6419 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1275 | offensiveReach x1.1827 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1276 | outnumberedCaution x1.0078 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1277 | threatExposure x1.3671 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1278 | threatExposure x1.1668 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1279 | maneuverTempoDenial x0.6653 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1280 | setupValue x1.0581 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1281 | lowHpCaution x1.0484 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1282 | mobilityDenial x1.2796 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1283 | allyDamage x1.4177 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1284 | setupValue x1.2644 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1285 | lowHpCaution x0.8092 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1286 | outnumberedCaution x1.2628 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1287 | threatExposure x0.6763 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1288 | setupValue x1.5933 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1289 | setupValue x1.5243 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1290 | closing x1.5504 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1291 | maneuverTempoDenial x1.1808 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1292 | maneuverTempoDenial x1.4091 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1293 | closing x1.0912 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1294 | offensiveReach x1.0831 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1295 | allyDamage x1.2231 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1296 | allyDamage x1.4398 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1297 | mobilityDenial x1.4455 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1298 | threatExposure x0.9168 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1299 | offensiveReach x0.7777 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1300 | outnumberedCaution x1.3938 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1301 | enemyDamage x1.0517 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1302 | setupValue x1.3804 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1303 | lowHpCaution x1.1711 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1304 | closing x1.5721 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1305 | maneuverTempoDenial x0.873 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1306 | enemyDamage x1.0061 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1307 | maneuverTempoDenial x0.7419 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1308 | outnumberedCaution x1.3409 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1309 | setupValue x1.0956 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1310 | allyDamage x0.8233 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1311 | allyDamage x0.6735 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1312 | closing x1.4873 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1313 | enemyDamage x1.4626 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1314 | setupValue x0.6073 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1315 | lowHpCaution x0.9728 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1316 | setupValue x1.068 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1317 | setupValue x1.2256 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1318 | allyDamage x0.9752 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1319 | lowHpCaution x0.6016 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1320 | enemyDamage x0.9192 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1321 | threatExposure x1.3752 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1322 | allyDamage x0.9208 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1323 | outnumberedCaution x0.8483 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1324 | allyDamage x0.8044 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1325 | enemyDamage x1.3758 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1326 | setupValue x0.7593 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1327 | outnumberedCaution x0.8026 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1328 | lowHpCaution x0.7605 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1329 | enemyDamage x0.6069 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 1330 | setupValue x0.6432 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1331 | mobilityDenial x0.9626 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1332 | outnumberedCaution x1.0634 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1333 | mobilityDenial x0.9337 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1334 | outnumberedCaution x0.717 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1335 | threatExposure x1.227 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1336 | mobilityDenial x0.9004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1337 | lowHpCaution x0.9397 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1338 | maneuverTempoDenial x1.4196 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1339 | outnumberedCaution x1.4657 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1340 | closing x1.3243 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1341 | threatExposure x1.5346 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1342 | threatExposure x1.2859 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1343 | closing x1.1951 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1344 | mobilityDenial x1.4543 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1345 | closing x0.9247 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1346 | outnumberedCaution x0.8996 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1347 | lowHpCaution x1.0875 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1348 | enemyDamage x0.8531 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1349 | threatExposure x0.9872 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1350 | closing x0.6885 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1351 | closing x1.171 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1352 | lowHpCaution x1.1587 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1353 | threatExposure x1.4309 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1354 | threatExposure x1.337 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1355 | allyDamage x0.9401 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1356 | setupValue x0.9415 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1357 | outnumberedCaution x0.8947 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1358 | threatExposure x1.1107 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1359 | threatExposure x0.8211 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1360 | enemyDamage x1.5473 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1361 | closing x1.5396 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1362 | offensiveReach x0.918 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1363 | closing x1.527 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1364 | maneuverTempoDenial x1.2382 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1365 | offensiveReach x1.1366 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1366 | mobilityDenial x1.4079 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1367 | threatExposure x1.4387 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1368 | threatExposure x1.2458 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1369 | setupValue x1.3363 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1370 | mobilityDenial x0.6008 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1371 | mobilityDenial x0.9429 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1372 | mobilityDenial x1.4713 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1373 | threatExposure x1.0292 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1374 | outnumberedCaution x0.6183 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1375 | outnumberedCaution x1.0691 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1376 | offensiveReach x0.808 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1377 | outnumberedCaution x1.4289 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1378 | allyDamage x0.8636 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1379 | closing x1.4592 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1380 | maneuverTempoDenial x1.0877 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1381 | mobilityDenial x1.0428 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1382 | mobilityDenial x1.3533 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1383 | outnumberedCaution x1.1654 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1384 | threatExposure x0.8897 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1385 | enemyDamage x0.6354 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1386 | mobilityDenial x0.9495 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1387 | maneuverTempoDenial x0.6515 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1388 | outnumberedCaution x1.2248 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1389 | outnumberedCaution x0.7201 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1390 | outnumberedCaution x1.4594 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1391 | allyDamage x1.3635 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1392 | setupValue x0.9583 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1393 | maneuverTempoDenial x1.1053 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1394 | offensiveReach x1.0581 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1395 | enemyDamage x1.077 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1396 | offensiveReach x0.6168 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1397 | offensiveReach x0.9856 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1398 | outnumberedCaution x0.9586 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1399 | lowHpCaution x1.2506 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1400 | enemyDamage x1.287 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1401 | allyDamage x0.9858 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1402 | setupValue x1.4862 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1403 | allyDamage x1.1663 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1404 | maneuverTempoDenial x1.3525 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1405 | enemyDamage x1.3653 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1406 | threatExposure x0.8509 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1407 | outnumberedCaution x1.5619 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1408 | threatExposure x1.0502 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1409 | threatExposure x1.441 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1410 | offensiveReach x1.5421 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1411 | maneuverTempoDenial x1.1587 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1412 | outnumberedCaution x0.7427 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1413 | closing x1.4821 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1414 | offensiveReach x1.5477 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1415 | mobilityDenial x0.9445 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1416 | enemyDamage x1.4456 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1417 | lowHpCaution x0.9412 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1418 | outnumberedCaution x1.1842 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1419 | enemyDamage x0.7536 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1420 | allyDamage x1.4263 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1421 | closing x1.4837 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1422 | maneuverTempoDenial x1.5614 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1423 | threatExposure x1.1803 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1424 | maneuverTempoDenial x1.0688 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1425 | allyDamage x1.3777 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1426 | offensiveReach x1.5667 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 1427 | offensiveReach x1.3616 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1428 | allyDamage x0.708 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1429 | offensiveReach x0.7302 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1430 | threatExposure x1.5015 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1431 | outnumberedCaution x1.5945 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1432 | outnumberedCaution x0.7969 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1433 | offensiveReach x0.8575 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1434 | outnumberedCaution x1.4949 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1435 | enemyDamage x1.5908 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1436 | setupValue x1.1412 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1437 | allyDamage x1.1224 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1438 | mobilityDenial x0.9419 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1439 | outnumberedCaution x1.4605 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1440 | allyDamage x0.9025 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1441 | lowHpCaution x1.0648 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1442 | threatExposure x1.5866 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1443 | enemyDamage x0.7262 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 1444 | enemyDamage x0.8887 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1445 | closing x1.258 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1446 | setupValue x1.4606 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1447 | offensiveReach x0.7127 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1448 | enemyDamage x1.4805 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1449 | outnumberedCaution x0.9634 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1450 | closing x1.0588 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1451 | enemyDamage x0.932 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1452 | maneuverTempoDenial x1.4664 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1453 | setupValue x1.1695 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1454 | enemyDamage x1.0253 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1455 | closing x0.6879 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1456 | outnumberedCaution x0.7268 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1457 | setupValue x1.4775 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1458 | threatExposure x1.5417 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1459 | lowHpCaution x0.9643 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1460 | maneuverTempoDenial x1.0574 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1461 | mobilityDenial x1.1907 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1462 | lowHpCaution x1.0049 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1463 | outnumberedCaution x0.9028 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1464 | lowHpCaution x1.4283 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1465 | enemyDamage x1.5382 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1466 | offensiveReach x1.457 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1467 | threatExposure x0.8972 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1468 | lowHpCaution x1.117 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1469 | mobilityDenial x1.5091 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1470 | closing x0.6746 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1471 | maneuverTempoDenial x1.3966 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1472 | lowHpCaution x1.2679 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1473 | maneuverTempoDenial x1.0925 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1474 | allyDamage x0.9946 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1475 | mobilityDenial x1.3081 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1476 | setupValue x1.1382 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1477 | maneuverTempoDenial x1.1028 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1478 | lowHpCaution x1.3129 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1479 | threatExposure x1.3658 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1480 | mobilityDenial x1.2025 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1481 | closing x1.3138 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1482 | offensiveReach x0.6706 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1483 | closing x1.0784 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1484 | setupValue x1.17 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1485 | maneuverTempoDenial x0.722 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1486 | lowHpCaution x0.6483 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1487 | mobilityDenial x0.9612 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1488 | threatExposure x1.3155 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1489 | allyDamage x0.9737 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1490 | mobilityDenial x0.8991 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1491 | lowHpCaution x0.6516 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1492 | maneuverTempoDenial x1.4431 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1493 | mobilityDenial x1.1279 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1494 | enemyDamage x1.1746 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1495 | lowHpCaution x1.3377 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1496 | threatExposure x1.1156 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1497 | offensiveReach x1.0803 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1498 | maneuverTempoDenial x0.7266 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1499 | maneuverTempoDenial x1.2429 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1500 | setupValue x1.2292 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1501 | outnumberedCaution x1.5208 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1502 | outnumberedCaution x1.4772 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1503 | setupValue x0.9778 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1504 | lowHpCaution x1.5228 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1505 | allyDamage x1.5689 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1506 | mobilityDenial x1.4306 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1507 | allyDamage x1.5101 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1508 | enemyDamage x0.8575 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1509 | offensiveReach x1.325 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1510 | allyDamage x0.6173 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1511 | allyDamage x0.7377 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1512 | outnumberedCaution x0.6232 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1513 | threatExposure x1.0718 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1514 | mobilityDenial x0.6034 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1515 | lowHpCaution x1.5089 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1516 | outnumberedCaution x1.0471 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1517 | enemyDamage x0.7558 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1518 | threatExposure x1.1968 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1519 | offensiveReach x0.9055 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1520 | allyDamage x1.0506 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1521 | setupValue x1.1037 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1522 | setupValue x0.6652 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1523 | maneuverTempoDenial x1.0065 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1524 | allyDamage x1.297 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1525 | allyDamage x0.6328 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1526 | offensiveReach x0.8867 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1527 | enemyDamage x1.4348 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1528 | offensiveReach x0.7625 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1529 | outnumberedCaution x1.2252 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1530 | maneuverTempoDenial x1.1718 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1531 | allyDamage x1.1736 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1532 | mobilityDenial x1.2976 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1533 | offensiveReach x1.1304 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1534 | allyDamage x1.2286 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1535 | closing x0.6804 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1536 | closing x1.4803 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1537 | lowHpCaution x0.6908 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1538 | setupValue x1.1027 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1539 | closing x1.2903 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1540 | maneuverTempoDenial x1.1736 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1541 | closing x0.7793 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1542 | lowHpCaution x1.0431 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1543 | lowHpCaution x1.0504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1544 | threatExposure x0.8964 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1545 | allyDamage x0.8956 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1546 | maneuverTempoDenial x1.4345 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1547 | enemyDamage x0.86 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 1548 | allyDamage x1.3368 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1549 | offensiveReach x0.8452 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1550 | setupValue x0.9648 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1551 | allyDamage x1.4311 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1552 | enemyDamage x1.2138 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1553 | lowHpCaution x0.9993 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1554 | lowHpCaution x0.6929 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1555 | setupValue x1.1091 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1556 | lowHpCaution x1.3912 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1557 | outnumberedCaution x0.6458 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1558 | outnumberedCaution x1.4033 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1559 | offensiveReach x1.2897 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1560 | allyDamage x1.4076 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1561 | maneuverTempoDenial x1.1377 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1562 | lowHpCaution x1.4296 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1563 | outnumberedCaution x0.6911 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1564 | lowHpCaution x0.6513 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1565 | lowHpCaution x1.1589 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1566 | offensiveReach x1.1823 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1567 | threatExposure x1.3365 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1568 | lowHpCaution x0.6842 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1569 | outnumberedCaution x0.8547 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1570 | enemyDamage x0.6969 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 1571 | allyDamage x0.6293 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1572 | enemyDamage x1.3166 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1573 | mobilityDenial x1.1897 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1574 | threatExposure x1.2352 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1575 | enemyDamage x1.3002 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1576 | allyDamage x1.5534 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1577 | setupValue x1.1649 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1578 | closing x1.2307 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1579 | outnumberedCaution x1.5165 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1580 | offensiveReach x1.415 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1581 | allyDamage x1.2916 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1582 | threatExposure x1.1441 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1583 | outnumberedCaution x0.745 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1584 | closing x1.4481 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1585 | enemyDamage x1.5113 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1586 | closing x1.0189 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1587 | allyDamage x0.7978 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1588 | threatExposure x1.5918 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1589 | lowHpCaution x0.7855 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1590 | threatExposure x1.5681 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1591 | enemyDamage x0.8776 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 1592 | allyDamage x1.1864 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1593 | closing x1.5963 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1594 | lowHpCaution x1.5406 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1595 | outnumberedCaution x1.5502 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1596 | offensiveReach x1.4017 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1597 | closing x0.7659 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1598 | maneuverTempoDenial x0.7866 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1599 | enemyDamage x0.8854 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 1600 | outnumberedCaution x1.0707 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1601 | enemyDamage x0.8426 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1602 | maneuverTempoDenial x1.1106 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1603 | allyDamage x0.6959 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1604 | setupValue x1.0773 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1605 | lowHpCaution x1.4288 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1606 | enemyDamage x1.5679 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1607 | mobilityDenial x0.6329 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1608 | allyDamage x1.2788 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1609 | maneuverTempoDenial x1.5007 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1610 | outnumberedCaution x1.4527 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1611 | setupValue x0.8799 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1612 | outnumberedCaution x0.6002 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1613 | closing x0.6468 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1614 | lowHpCaution x1.5039 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1615 | mobilityDenial x1.5227 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1616 | setupValue x1.4498 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1617 | allyDamage x0.6525 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1618 | offensiveReach x1.0977 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1619 | outnumberedCaution x1.4945 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1620 | mobilityDenial x1.3627 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1621 | enemyDamage x1.3713 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1622 | maneuverTempoDenial x1.1413 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1623 | maneuverTempoDenial x1.0186 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1624 | maneuverTempoDenial x1.4045 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1625 | setupValue x1.5207 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1626 | maneuverTempoDenial x1.3241 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1627 | offensiveReach x0.6361 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1628 | offensiveReach x1.5176 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1629 | setupValue x0.8653 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1630 | maneuverTempoDenial x1.5144 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1631 | mobilityDenial x0.9738 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1632 | offensiveReach x0.9827 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1633 | setupValue x1.1769 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1634 | lowHpCaution x0.797 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1635 | offensiveReach x1.1709 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1636 | offensiveReach x1.294 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1637 | mobilityDenial x1.5664 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1638 | setupValue x0.7338 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1639 | offensiveReach x1.4461 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1640 | closing x0.8686 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1641 | setupValue x0.8559 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1642 | outnumberedCaution x1.123 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1643 | threatExposure x0.6599 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1644 | threatExposure x1.2407 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1645 | closing x1.4981 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1646 | allyDamage x0.9173 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1647 | closing x0.6712 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1648 | offensiveReach x1.5278 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1649 | allyDamage x0.9371 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1650 | allyDamage x1.5927 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1651 | maneuverTempoDenial x0.9143 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1652 | allyDamage x1.5945 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1653 | lowHpCaution x0.821 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1654 | allyDamage x0.6236 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1655 | threatExposure x0.7842 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1656 | threatExposure x1.4001 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1657 | mobilityDenial x1.07 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1658 | setupValue x1.5262 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1659 | mobilityDenial x1.4967 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1660 | maneuverTempoDenial x0.9641 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1661 | threatExposure x0.8135 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1662 | offensiveReach x0.7561 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1663 | threatExposure x0.7133 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1664 | enemyDamage x0.9305 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1665 | allyDamage x1.5319 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1666 | closing x1.4271 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1667 | lowHpCaution x0.859 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1668 | lowHpCaution x1.1551 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1669 | offensiveReach x0.9941 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1670 | enemyDamage x0.7307 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1671 | lowHpCaution x0.7474 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1672 | offensiveReach x0.8313 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1673 | enemyDamage x1.5467 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1674 | closing x0.7764 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1675 | offensiveReach x0.7184 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1676 | closing x0.9712 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1677 | maneuverTempoDenial x0.6903 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1678 | lowHpCaution x1.1263 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1679 | threatExposure x1.1328 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1680 | allyDamage x1.2568 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1681 | offensiveReach x1.4752 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1682 | maneuverTempoDenial x1.3235 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1683 | mobilityDenial x0.9002 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1684 | allyDamage x1.3147 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1685 | setupValue x1.5215 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1686 | outnumberedCaution x1.1358 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1687 | maneuverTempoDenial x1.0531 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1688 | setupValue x1.3717 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1689 | lowHpCaution x0.8079 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1690 | closing x1.4557 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1691 | enemyDamage x0.852 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 1692 | enemyDamage x0.9782 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1693 | lowHpCaution x1.5302 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1694 | maneuverTempoDenial x1.3975 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1695 | mobilityDenial x1.3919 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1696 | mobilityDenial x0.9044 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1697 | mobilityDenial x0.8419 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1698 | offensiveReach x0.6948 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1699 | maneuverTempoDenial x1.578 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1700 | enemyDamage x0.8135 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1701 | maneuverTempoDenial x1.5074 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1702 | threatExposure x0.9385 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1703 | enemyDamage x0.6925 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 1704 | offensiveReach x1.1374 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1705 | closing x0.9788 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1706 | maneuverTempoDenial x1.2398 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1707 | setupValue x0.8538 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1708 | allyDamage x1.002 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1709 | lowHpCaution x1.3851 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1710 | threatExposure x1.4324 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1711 | offensiveReach x1.0927 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1712 | mobilityDenial x1.0943 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1713 | enemyDamage x0.8633 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1714 | setupValue x0.831 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1715 | closing x0.6999 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1716 | outnumberedCaution x1.0747 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1717 | threatExposure x1.4111 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1718 | threatExposure x0.6958 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1719 | threatExposure x1.1083 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1720 | maneuverTempoDenial x0.7854 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1721 | mobilityDenial x1.5099 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1722 | maneuverTempoDenial x1.4547 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1723 | maneuverTempoDenial x1.0465 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1724 | allyDamage x1.3185 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1725 | threatExposure x1.4245 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1726 | closing x1.2488 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1727 | closing x0.8277 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1728 | mobilityDenial x1.285 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1729 | closing x1.4194 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1730 | allyDamage x1.1812 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1731 | outnumberedCaution x1.4384 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1732 | lowHpCaution x0.7686 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1733 | enemyDamage x1.0328 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1734 | setupValue x1.0182 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1735 | enemyDamage x0.7185 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1736 | lowHpCaution x0.7594 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1737 | maneuverTempoDenial x1.1286 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1738 | enemyDamage x0.9156 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1739 | setupValue x0.7482 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1740 | allyDamage x0.9171 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1741 | maneuverTempoDenial x0.683 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1742 | mobilityDenial x0.7898 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1743 | setupValue x1.2179 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1744 | offensiveReach x0.646 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1745 | outnumberedCaution x1.2246 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1746 | lowHpCaution x1.036 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1747 | outnumberedCaution x1.1177 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1748 | allyDamage x1.3649 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1749 | closing x0.6386 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1750 | threatExposure x1.368 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1751 | maneuverTempoDenial x1.1036 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1752 | threatExposure x0.6584 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1753 | maneuverTempoDenial x0.9038 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1754 | enemyDamage x1.5092 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1755 | setupValue x0.7425 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1756 | maneuverTempoDenial x1.4513 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1757 | lowHpCaution x1.4266 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1758 | enemyDamage x1.4139 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1759 | maneuverTempoDenial x1.4851 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1760 | enemyDamage x0.9857 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1761 | enemyDamage x0.706 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1762 | setupValue x0.6367 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1763 | enemyDamage x0.93 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1764 | threatExposure x1.4104 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1765 | threatExposure x1.5667 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1766 | mobilityDenial x1.4104 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1767 | maneuverTempoDenial x1.3942 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1768 | enemyDamage x1.154 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1769 | allyDamage x1.3264 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1770 | closing x1.3246 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1771 | mobilityDenial x1.1208 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1772 | allyDamage x1.0216 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1773 | offensiveReach x0.8852 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1774 | enemyDamage x1.5135 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1775 | enemyDamage x0.9638 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1776 | enemyDamage x1.4729 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1777 | threatExposure x0.9305 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1778 | enemyDamage x1.0471 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1779 | enemyDamage x0.6184 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 1780 | offensiveReach x1.1699 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1781 | setupValue x0.7323 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1782 | setupValue x1.551 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1783 | outnumberedCaution x1.2437 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1784 | allyDamage x0.658 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1785 | allyDamage x1.0063 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1786 | lowHpCaution x1.3613 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1787 | maneuverTempoDenial x0.9238 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1788 | allyDamage x1.0591 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1789 | mobilityDenial x1.1172 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1790 | offensiveReach x0.8557 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1791 | outnumberedCaution x1.4523 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1792 | allyDamage x1.3456 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1793 | allyDamage x1.2028 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1794 | maneuverTempoDenial x1.0351 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1795 | lowHpCaution x0.7764 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1796 | mobilityDenial x1.5247 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1797 | enemyDamage x0.8259 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 1798 | offensiveReach x0.8963 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1799 | enemyDamage x1.3176 | baseline-v1:50.0% | 3/6 beaten | rejected |
| 1800 | allyDamage x1.5309 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1801 | allyDamage x0.7034 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1802 | threatExposure x0.7323 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1803 | outnumberedCaution x0.9826 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1804 | setupValue x0.8066 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1805 | lowHpCaution x0.9856 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1806 | closing x1.3835 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1807 | setupValue x0.9811 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1808 | enemyDamage x1.5736 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1809 | threatExposure x1.431 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1810 | allyDamage x1.2462 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1811 | enemyDamage x1.0159 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1812 | mobilityDenial x1.0066 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1813 | closing x1.4974 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1814 | threatExposure x1.5317 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1815 | threatExposure x0.7785 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1816 | mobilityDenial x1.4913 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1817 | setupValue x0.9766 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1818 | setupValue x0.7388 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1819 | mobilityDenial x1.2405 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1820 | threatExposure x0.8304 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1821 | mobilityDenial x1.0387 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1822 | lowHpCaution x1.0724 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1823 | mobilityDenial x1.0877 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1824 | lowHpCaution x1.4402 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1825 | closing x1.3883 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1826 | threatExposure x1.392 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1827 | setupValue x0.8725 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1828 | enemyDamage x0.7048 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1829 | lowHpCaution x0.8285 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1830 | maneuverTempoDenial x0.9287 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1831 | outnumberedCaution x0.9069 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1832 | closing x1.1215 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1833 | allyDamage x1.3225 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1834 | threatExposure x1.3946 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1835 | setupValue x1.3812 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1836 | offensiveReach x1.1799 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1837 | offensiveReach x0.6252 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1838 | allyDamage x1.1784 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1839 | allyDamage x0.9822 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1840 | lowHpCaution x1.2967 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1841 | mobilityDenial x0.735 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1842 | offensiveReach x1.0512 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1843 | threatExposure x1.5158 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1844 | mobilityDenial x1.2315 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1845 | threatExposure x0.9567 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1846 | allyDamage x0.6418 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1847 | setupValue x0.7827 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1848 | setupValue x0.7468 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1849 | enemyDamage x0.6141 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 1850 | lowHpCaution x0.9734 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1851 | setupValue x1.3185 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1852 | enemyDamage x0.6032 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 1853 | lowHpCaution x1.0246 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1854 | offensiveReach x1.2345 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1855 | mobilityDenial x1.2207 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1856 | enemyDamage x1.0672 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1857 | offensiveReach x1.5484 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1858 | outnumberedCaution x0.6324 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1859 | lowHpCaution x0.9683 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1860 | offensiveReach x0.9196 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1861 | outnumberedCaution x1.022 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1862 | mobilityDenial x0.7514 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1863 | allyDamage x1.2651 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1864 | maneuverTempoDenial x1.3072 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1865 | enemyDamage x1.1549 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1866 | closing x0.7847 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1867 | allyDamage x1.409 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1868 | allyDamage x0.8465 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1869 | threatExposure x1.308 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1870 | offensiveReach x1.1433 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1871 | offensiveReach x0.6828 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1872 | threatExposure x1.4431 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1873 | closing x1.1033 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1874 | closing x0.7897 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1875 | allyDamage x1.1401 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1876 | allyDamage x0.8614 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1877 | mobilityDenial x1.4508 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1878 | closing x1.1197 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1879 | enemyDamage x1.0392 | baseline-v1:50.0% | 3/6 beaten | rejected |
| 1880 | allyDamage x1.0634 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1881 | closing x1.3833 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1882 | closing x0.8592 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 1883 | offensiveReach x0.7813 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1884 | threatExposure x0.7757 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1885 | maneuverTempoDenial x0.6862 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1886 | allyDamage x1.1507 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1887 | offensiveReach x1.1416 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1888 | threatExposure x1.081 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1889 | mobilityDenial x1.1363 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1890 | outnumberedCaution x0.7194 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1891 | maneuverTempoDenial x0.8885 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1892 | offensiveReach x0.651 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1893 | threatExposure x1.1105 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1894 | setupValue x1.5802 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1895 | outnumberedCaution x0.9619 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1896 | allyDamage x1.1574 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1897 | threatExposure x1.2832 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1898 | offensiveReach x1.3002 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1899 | maneuverTempoDenial x1.1931 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1900 | enemyDamage x0.6272 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 1901 | maneuverTempoDenial x1.2688 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1902 | setupValue x1.4066 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1903 | enemyDamage x0.7936 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 1904 | threatExposure x0.9689 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1905 | closing x0.9326 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1906 | closing x1.2797 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1907 | closing x0.6635 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1908 | threatExposure x1.325 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1909 | enemyDamage x0.9206 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1910 | threatExposure x1.3572 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1911 | closing x1.0853 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1912 | setupValue x1.2008 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1913 | lowHpCaution x1.1577 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1914 | setupValue x0.9562 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1915 | enemyDamage x1.5249 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1916 | outnumberedCaution x1.1908 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1917 | mobilityDenial x1.2755 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1918 | threatExposure x0.9739 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1919 | threatExposure x1.5481 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 1920 | maneuverTempoDenial x0.6904 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1921 | setupValue x0.8931 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1922 | setupValue x1.0318 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1923 | setupValue x1.3386 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1924 | allyDamage x0.6797 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1925 | lowHpCaution x1.1147 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1926 | lowHpCaution x0.8582 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1927 | outnumberedCaution x0.78 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1928 | outnumberedCaution x1.5288 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1929 | lowHpCaution x1.113 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1930 | threatExposure x0.7192 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1931 | lowHpCaution x1.29 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1932 | setupValue x1.0266 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1933 | threatExposure x1.3419 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1934 | outnumberedCaution x1.0313 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1935 | maneuverTempoDenial x1.3225 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1936 | setupValue x1.1263 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1937 | maneuverTempoDenial x1.5023 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1938 | threatExposure x0.6318 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 1939 | mobilityDenial x0.8371 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1940 | mobilityDenial x1.1357 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1941 | mobilityDenial x0.802 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1942 | threatExposure x1.2387 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1943 | mobilityDenial x1.5958 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1944 | mobilityDenial x0.93 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1945 | lowHpCaution x1.159 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1946 | threatExposure x1.3539 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1947 | lowHpCaution x1.4393 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1948 | allyDamage x1.3017 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1949 | outnumberedCaution x1.0051 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1950 | mobilityDenial x1.1118 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1951 | outnumberedCaution x1.2815 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1952 | lowHpCaution x1.4193 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1953 | outnumberedCaution x1.411 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1954 | setupValue x0.7638 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1955 | offensiveReach x1.3385 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1956 | lowHpCaution x1.5464 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1957 | setupValue x1.1251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1958 | mobilityDenial x0.9136 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1959 | offensiveReach x1.4524 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1960 | maneuverTempoDenial x1.4262 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1961 | threatExposure x0.9601 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1962 | allyDamage x0.8915 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1963 | lowHpCaution x1.3887 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1964 | maneuverTempoDenial x1.4656 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1965 | allyDamage x1.5987 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1966 | outnumberedCaution x1.5889 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1967 | threatExposure x1.0115 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1968 | offensiveReach x0.6658 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1969 | offensiveReach x1.274 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 1970 | allyDamage x1.4809 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1971 | mobilityDenial x1.3733 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1972 | mobilityDenial x1.4525 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1973 | allyDamage x1.426 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1974 | mobilityDenial x1.1003 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1975 | outnumberedCaution x1.5609 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1976 | maneuverTempoDenial x1.0959 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1977 | threatExposure x1.0894 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1978 | mobilityDenial x1.2156 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1979 | enemyDamage x1.1368 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1980 | outnumberedCaution x1.0188 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1981 | setupValue x0.7758 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1982 | allyDamage x0.9636 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1983 | offensiveReach x1.1873 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1984 | setupValue x1.3862 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1985 | allyDamage x0.8054 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1986 | allyDamage x1.214 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1987 | threatExposure x0.9408 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1988 | setupValue x1.1611 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1989 | offensiveReach x1.1134 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1990 | mobilityDenial x1.4105 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1991 | offensiveReach x0.6943 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 1992 | enemyDamage x1.4264 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1993 | mobilityDenial x1.0978 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1994 | allyDamage x1.2504 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1995 | lowHpCaution x1.1622 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1996 | allyDamage x1.3236 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 1997 | outnumberedCaution x0.9251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1998 | mobilityDenial x1.3673 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 1999 | outnumberedCaution x0.6115 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2000 | outnumberedCaution x1.3758 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2001 | mobilityDenial x1.5275 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2002 | outnumberedCaution x0.9376 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2003 | allyDamage x1.1518 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2004 | setupValue x1.3699 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2005 | offensiveReach x1.007 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2006 | offensiveReach x1.5431 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2007 | enemyDamage x1.2637 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2008 | maneuverTempoDenial x1.2721 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2009 | maneuverTempoDenial x0.6262 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2010 | offensiveReach x0.8923 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2011 | closing x1.4142 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2012 | mobilityDenial x1.5793 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2013 | setupValue x1.4498 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2014 | maneuverTempoDenial x1.2447 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2015 | enemyDamage x1.3991 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2016 | threatExposure x1.4002 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2017 | outnumberedCaution x0.6384 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2018 | mobilityDenial x1.3375 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2019 | outnumberedCaution x1.2073 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2020 | closing x0.8414 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2021 | threatExposure x1.4198 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2022 | lowHpCaution x1.3746 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2023 | maneuverTempoDenial x0.7099 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2024 | closing x1.168 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2025 | allyDamage x1.4132 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2026 | maneuverTempoDenial x0.732 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2027 | lowHpCaution x1.027 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2028 | offensiveReach x1.2277 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2029 | lowHpCaution x1.3059 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2030 | allyDamage x0.9791 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2031 | enemyDamage x0.9533 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2032 | mobilityDenial x1.1459 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2033 | lowHpCaution x1.1117 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2034 | closing x1.5418 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2035 | allyDamage x1.1573 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2036 | mobilityDenial x0.803 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2037 | maneuverTempoDenial x1.3679 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2038 | enemyDamage x0.6191 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2039 | lowHpCaution x0.6616 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2040 | lowHpCaution x0.7516 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2041 | threatExposure x0.7762 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2042 | outnumberedCaution x0.777 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2043 | lowHpCaution x0.9517 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2044 | closing x1.0908 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2045 | offensiveReach x1.2309 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2046 | closing x1.2852 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2047 | lowHpCaution x0.7357 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2048 | offensiveReach x1.0259 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2049 | maneuverTempoDenial x0.7686 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2050 | allyDamage x1.1467 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2051 | enemyDamage x1.0761 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2052 | lowHpCaution x1.0074 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2053 | setupValue x1.4612 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2054 | allyDamage x1.1529 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2055 | lowHpCaution x1.0872 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2056 | maneuverTempoDenial x1.1673 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2057 | closing x1.0309 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2058 | closing x1.104 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2059 | enemyDamage x0.7727 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2060 | closing x1.4182 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2061 | outnumberedCaution x0.9013 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2062 | setupValue x1.3346 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2063 | maneuverTempoDenial x1.4441 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2064 | threatExposure x1.4338 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2065 | allyDamage x1.4935 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2066 | lowHpCaution x1.4409 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2067 | maneuverTempoDenial x1.5859 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2068 | maneuverTempoDenial x1.1625 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2069 | lowHpCaution x1.3344 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2070 | outnumberedCaution x0.7064 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2071 | allyDamage x0.82 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2072 | outnumberedCaution x1.4243 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2073 | mobilityDenial x1.2911 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2074 | lowHpCaution x1.5033 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2075 | outnumberedCaution x1.1297 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2076 | maneuverTempoDenial x1.5469 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2077 | lowHpCaution x1.4163 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2078 | enemyDamage x1.0373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2079 | maneuverTempoDenial x1.3492 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2080 | setupValue x0.8196 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2081 | setupValue x1.3217 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2082 | threatExposure x0.7533 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2083 | outnumberedCaution x0.9054 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2084 | offensiveReach x1.0347 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2085 | allyDamage x1.3652 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2086 | enemyDamage x0.6595 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2087 | outnumberedCaution x1.2126 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2088 | threatExposure x1.3197 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2089 | maneuverTempoDenial x1.0294 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2090 | outnumberedCaution x1.4585 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2091 | mobilityDenial x0.9103 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2092 | allyDamage x0.7312 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2093 | closing x1.3363 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2094 | lowHpCaution x0.8368 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2095 | setupValue x1.2533 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2096 | offensiveReach x1.2798 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2097 | maneuverTempoDenial x1.3356 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2098 | enemyDamage x0.8332 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2099 | mobilityDenial x0.6637 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2100 | closing x0.8526 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2101 | setupValue x1.0871 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2102 | mobilityDenial x1.5506 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2103 | threatExposure x1.1037 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2104 | mobilityDenial x1.4382 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2105 | enemyDamage x0.9015 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 2106 | closing x1.4294 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2107 | outnumberedCaution x1.1338 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2108 | maneuverTempoDenial x0.8799 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2109 | threatExposure x1.0175 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2110 | maneuverTempoDenial x0.8566 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2111 | lowHpCaution x1.213 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2112 | outnumberedCaution x1.1082 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2113 | maneuverTempoDenial x1.1336 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2114 | maneuverTempoDenial x0.9993 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2115 | outnumberedCaution x1.2216 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2116 | outnumberedCaution x1.0911 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2117 | maneuverTempoDenial x0.9283 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2118 | mobilityDenial x0.7421 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2119 | allyDamage x0.7566 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2120 | lowHpCaution x0.9923 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2121 | enemyDamage x1.3901 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2122 | closing x1.3375 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2123 | maneuverTempoDenial x0.9592 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2124 | maneuverTempoDenial x0.853 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2125 | closing x0.858 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2126 | lowHpCaution x0.6105 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2127 | mobilityDenial x0.9593 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2128 | offensiveReach x0.7839 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2129 | enemyDamage x1.3584 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2130 | setupValue x1.3268 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2131 | setupValue x1.4716 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2132 | lowHpCaution x0.6857 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2133 | mobilityDenial x0.8335 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2134 | lowHpCaution x1.1124 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2135 | allyDamage x1.5171 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2136 | lowHpCaution x1.0002 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2137 | lowHpCaution x1.0112 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2138 | maneuverTempoDenial x1.1695 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2139 | lowHpCaution x1.5948 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2140 | setupValue x1.0606 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2141 | offensiveReach x0.6759 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2142 | lowHpCaution x1.2839 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2143 | mobilityDenial x0.7095 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2144 | closing x1.347 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2145 | maneuverTempoDenial x0.9102 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2146 | mobilityDenial x1.5857 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2147 | maneuverTempoDenial x0.625 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2148 | allyDamage x0.999 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2149 | mobilityDenial x0.9361 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2150 | lowHpCaution x0.7635 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2151 | offensiveReach x1.2693 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2152 | offensiveReach x1.1592 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2153 | lowHpCaution x1.3102 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2154 | setupValue x0.7045 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2155 | enemyDamage x1.4714 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2156 | lowHpCaution x0.6062 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2157 | mobilityDenial x0.7104 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2158 | setupValue x0.9485 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2159 | allyDamage x0.7188 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2160 | mobilityDenial x1.4235 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2161 | setupValue x1.5571 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2162 | threatExposure x0.9112 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2163 | setupValue x0.9313 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2164 | mobilityDenial x1.3085 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2165 | closing x1.2135 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2166 | allyDamage x0.6336 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2167 | mobilityDenial x1.2645 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2168 | offensiveReach x1.4923 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2169 | maneuverTempoDenial x1.1068 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2170 | lowHpCaution x0.9753 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2171 | offensiveReach x0.9757 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2172 | outnumberedCaution x1.418 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2173 | maneuverTempoDenial x0.9864 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2174 | allyDamage x1.2572 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2175 | allyDamage x1.5802 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2176 | closing x1.0411 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2177 | maneuverTempoDenial x1.0844 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2178 | lowHpCaution x0.7654 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2179 | allyDamage x0.7625 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2180 | mobilityDenial x1.1362 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2181 | allyDamage x0.8221 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2182 | closing x0.9235 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2183 | allyDamage x1.2152 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2184 | closing x1.2288 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2185 | setupValue x0.6074 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2186 | lowHpCaution x1.1117 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2187 | offensiveReach x0.7537 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2188 | threatExposure x1.58 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2189 | closing x0.9704 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2190 | offensiveReach x0.6537 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2191 | threatExposure x1.148 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2192 | lowHpCaution x1.3908 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2193 | threatExposure x1.3077 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2194 | offensiveReach x1.4793 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2195 | mobilityDenial x1.5946 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2196 | threatExposure x1.4781 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2197 | setupValue x1.2731 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2198 | mobilityDenial x0.7801 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2199 | setupValue x1.1278 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2200 | maneuverTempoDenial x1.3724 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2201 | setupValue x0.6303 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2202 | offensiveReach x1.5348 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2203 | offensiveReach x1.5824 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 2204 | allyDamage x0.7258 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2205 | maneuverTempoDenial x0.7818 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2206 | mobilityDenial x0.8068 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2207 | allyDamage x1.189 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2208 | threatExposure x1.1923 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2209 | threatExposure x1.1578 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2210 | closing x1.2353 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2211 | offensiveReach x1.0489 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2212 | mobilityDenial x0.6952 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2213 | lowHpCaution x1.4599 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2214 | allyDamage x1.2694 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2215 | maneuverTempoDenial x1.1204 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2216 | threatExposure x0.7779 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2217 | allyDamage x1.0939 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2218 | lowHpCaution x1.255 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2219 | lowHpCaution x0.8048 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2220 | closing x1.3949 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2221 | offensiveReach x0.9489 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2222 | threatExposure x1.0189 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2223 | maneuverTempoDenial x0.6722 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2224 | maneuverTempoDenial x1.5295 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2225 | mobilityDenial x1.236 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2226 | allyDamage x1.439 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2227 | enemyDamage x1.4158 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2228 | allyDamage x1.2296 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2229 | offensiveReach x0.743 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2230 | outnumberedCaution x1.1154 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2231 | lowHpCaution x1.1603 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2232 | lowHpCaution x0.6006 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2233 | setupValue x1.131 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2234 | mobilityDenial x0.6342 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2235 | enemyDamage x1.4146 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2236 | offensiveReach x1.0053 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2237 | mobilityDenial x0.8251 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2238 | lowHpCaution x0.9035 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2239 | maneuverTempoDenial x0.6207 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2240 | lowHpCaution x1.0999 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2241 | maneuverTempoDenial x1.5646 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2242 | outnumberedCaution x1.3887 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2243 | mobilityDenial x0.9074 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2244 | setupValue x0.6076 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2245 | enemyDamage x0.6891 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 2246 | closing x1.419 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2247 | offensiveReach x1.1052 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2248 | maneuverTempoDenial x0.7263 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2249 | closing x0.6271 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2250 | mobilityDenial x0.7109 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2251 | closing x1.5091 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2252 | outnumberedCaution x1.5867 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2253 | closing x1.2608 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2254 | closing x1.5118 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2255 | threatExposure x0.8345 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2256 | lowHpCaution x0.6338 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2257 | setupValue x1.2211 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2258 | offensiveReach x1.1198 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2259 | offensiveReach x0.7844 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2260 | allyDamage x1.2168 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2261 | outnumberedCaution x1.2621 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2262 | offensiveReach x1.0454 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2263 | enemyDamage x1.5742 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2264 | lowHpCaution x0.8247 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2265 | mobilityDenial x0.9454 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2266 | closing x1.5475 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2267 | allyDamage x1.1113 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2268 | setupValue x0.7311 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2269 | threatExposure x1.0033 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2270 | offensiveReach x0.6745 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2271 | outnumberedCaution x1.2475 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2272 | offensiveReach x1.1018 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2273 | outnumberedCaution x0.6435 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2274 | lowHpCaution x1.5685 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2275 | offensiveReach x1.32 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2276 | threatExposure x1.3581 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2277 | setupValue x0.679 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2278 | threatExposure x0.7155 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2279 | lowHpCaution x1.1164 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2280 | enemyDamage x1.2938 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2281 | outnumberedCaution x0.7562 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2282 | setupValue x1.568 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2283 | enemyDamage x0.8899 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 2284 | maneuverTempoDenial x1.3281 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2285 | allyDamage x1.28 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2286 | lowHpCaution x1.5221 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2287 | closing x0.6515 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2288 | setupValue x1.4209 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2289 | threatExposure x0.7636 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2290 | allyDamage x1.3564 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2291 | closing x1.3581 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2292 | allyDamage x0.6293 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2293 | enemyDamage x1.4521 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2294 | enemyDamage x0.804 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2295 | lowHpCaution x0.7716 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2296 | enemyDamage x0.8415 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2297 | mobilityDenial x1.2743 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2298 | offensiveReach x0.8093 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2299 | outnumberedCaution x1.433 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2300 | closing x1.0124 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2301 | outnumberedCaution x1.5218 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2302 | outnumberedCaution x0.9181 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2303 | lowHpCaution x1.2005 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2304 | offensiveReach x1.4607 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2305 | setupValue x0.9646 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2306 | offensiveReach x1.0029 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2307 | mobilityDenial x1.5078 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2308 | offensiveReach x1.1676 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2309 | closing x1.2308 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2310 | closing x1.4664 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2311 | maneuverTempoDenial x1.5323 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2312 | maneuverTempoDenial x1.5056 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2313 | enemyDamage x1.5723 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2314 | threatExposure x1.3425 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2315 | enemyDamage x1.5863 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2316 | lowHpCaution x1.1373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2317 | threatExposure x1.1747 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2318 | setupValue x1.0976 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2319 | mobilityDenial x1.0971 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2320 | mobilityDenial x1.5096 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2321 | allyDamage x1.3419 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2322 | threatExposure x0.9496 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2323 | threatExposure x1.2563 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2324 | maneuverTempoDenial x1.5059 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2325 | closing x0.6082 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2326 | enemyDamage x1.5105 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2327 | threatExposure x1.5934 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2328 | setupValue x1.0276 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2329 | enemyDamage x1.1339 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2330 | maneuverTempoDenial x1.5617 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2331 | maneuverTempoDenial x0.6845 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2332 | allyDamage x0.6224 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2333 | threatExposure x1.4981 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2334 | allyDamage x1.1381 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2335 | mobilityDenial x1.5555 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2336 | maneuverTempoDenial x1.3507 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2337 | outnumberedCaution x0.8492 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2338 | outnumberedCaution x1.5151 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2339 | outnumberedCaution x0.9624 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2340 | allyDamage x1.0289 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2341 | closing x1.1456 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2342 | closing x1.2518 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2343 | offensiveReach x1.2713 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2344 | closing x1.0635 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2345 | enemyDamage x1.5181 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2346 | offensiveReach x0.9036 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2347 | outnumberedCaution x0.6359 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2348 | outnumberedCaution x1.3953 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2349 | enemyDamage x0.6217 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 2350 | setupValue x0.6569 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2351 | closing x1.017 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2352 | enemyDamage x1.2172 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2353 | allyDamage x0.8282 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2354 | threatExposure x0.7748 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2355 | threatExposure x1.0944 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2356 | lowHpCaution x0.9946 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2357 | lowHpCaution x0.774 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2358 | closing x1.5316 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2359 | offensiveReach x1.5351 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2360 | mobilityDenial x1.2854 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2361 | lowHpCaution x0.7989 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2362 | outnumberedCaution x0.9819 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2363 | closing x1.0258 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2364 | setupValue x0.6104 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2365 | mobilityDenial x0.7355 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2366 | lowHpCaution x1.588 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2367 | mobilityDenial x0.8265 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2368 | lowHpCaution x1.4879 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2369 | mobilityDenial x1.2103 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2370 | enemyDamage x1.5179 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2371 | setupValue x0.6209 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2372 | allyDamage x1.3033 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2373 | enemyDamage x1.4029 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2374 | offensiveReach x0.8999 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2375 | threatExposure x1.2509 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2376 | lowHpCaution x1.3056 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2377 | maneuverTempoDenial x1.0643 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2378 | mobilityDenial x0.889 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2379 | threatExposure x1.3316 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2380 | setupValue x0.8504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2381 | offensiveReach x0.7162 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2382 | maneuverTempoDenial x1.1009 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2383 | lowHpCaution x1.0448 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2384 | allyDamage x1.3462 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2385 | allyDamage x1.264 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2386 | maneuverTempoDenial x1.0125 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2387 | enemyDamage x0.6331 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2388 | outnumberedCaution x0.7534 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2389 | lowHpCaution x1.5418 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2390 | offensiveReach x0.9026 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2391 | threatExposure x1.482 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2392 | mobilityDenial x0.995 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2393 | closing x1.5319 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2394 | allyDamage x1.1662 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2395 | offensiveReach x1.1254 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2396 | mobilityDenial x1.1022 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2397 | closing x1.5822 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2398 | setupValue x1.4942 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2399 | allyDamage x0.9763 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2400 | lowHpCaution x1.2144 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2401 | allyDamage x1.3753 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2402 | outnumberedCaution x0.616 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2403 | mobilityDenial x1.3996 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2404 | outnumberedCaution x1.5522 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2405 | enemyDamage x1.4752 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2406 | enemyDamage x1.2643 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2407 | offensiveReach x0.984 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2408 | lowHpCaution x1.2436 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2409 | threatExposure x1.3567 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2410 | setupValue x1.451 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2411 | offensiveReach x1.0036 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2412 | setupValue x1.0926 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2413 | offensiveReach x1.3543 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2414 | outnumberedCaution x0.6088 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2415 | closing x1.1482 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2416 | allyDamage x1.0099 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2417 | enemyDamage x1.225 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2418 | offensiveReach x0.6414 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2419 | closing x0.8383 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2420 | threatExposure x0.714 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2421 | enemyDamage x1.0713 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2422 | enemyDamage x1.2144 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2423 | allyDamage x1.2779 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2424 | enemyDamage x1.0483 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2425 | enemyDamage x1.0682 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2426 | maneuverTempoDenial x1.2689 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2427 | setupValue x1.1065 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2428 | enemyDamage x0.7602 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2429 | closing x1.4193 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2430 | offensiveReach x1.531 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2431 | threatExposure x0.7047 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2432 | closing x1.2379 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2433 | threatExposure x0.742 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2434 | allyDamage x1.4483 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2435 | offensiveReach x0.7799 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2436 | mobilityDenial x1.4232 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2437 | lowHpCaution x1.4079 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2438 | closing x0.892 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2439 | mobilityDenial x0.8503 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2440 | offensiveReach x1.4397 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2441 | lowHpCaution x1.5207 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2442 | allyDamage x0.9835 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2443 | setupValue x1.2699 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2444 | offensiveReach x1.4047 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2445 | offensiveReach x0.8418 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2446 | threatExposure x0.7605 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2447 | lowHpCaution x1.5416 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2448 | lowHpCaution x1.3854 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2449 | offensiveReach x1.5332 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2450 | mobilityDenial x1.41 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2451 | maneuverTempoDenial x0.6992 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2452 | lowHpCaution x0.9379 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2453 | threatExposure x0.7611 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2454 | threatExposure x0.7242 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2455 | closing x0.6693 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2456 | threatExposure x1.5978 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2457 | enemyDamage x0.711 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2458 | lowHpCaution x1.4263 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2459 | outnumberedCaution x1.5163 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2460 | enemyDamage x1.3375 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2461 | mobilityDenial x1.0224 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2462 | setupValue x0.772 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2463 | outnumberedCaution x1.3173 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2464 | offensiveReach x0.7803 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2465 | threatExposure x1.5991 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2466 | outnumberedCaution x1.3194 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2467 | lowHpCaution x1.4724 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2468 | closing x1.1811 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2469 | enemyDamage x0.7788 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2470 | setupValue x1.5523 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2471 | outnumberedCaution x0.6459 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2472 | allyDamage x0.8999 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2473 | mobilityDenial x1.0516 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2474 | setupValue x0.8384 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2475 | mobilityDenial x1.1007 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2476 | threatExposure x1.2324 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2477 | enemyDamage x1.2017 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2478 | threatExposure x1.0903 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2479 | enemyDamage x1.1942 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2480 | lowHpCaution x1.3702 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2481 | mobilityDenial x0.9286 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2482 | offensiveReach x0.7646 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2483 | allyDamage x0.7893 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2484 | offensiveReach x0.6993 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2485 | outnumberedCaution x0.8135 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2486 | allyDamage x0.6316 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2487 | closing x0.7592 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2488 | threatExposure x1.2454 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2489 | outnumberedCaution x1.3003 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2490 | setupValue x1.2575 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2491 | allyDamage x1.4262 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2492 | enemyDamage x1.538 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2493 | setupValue x1.5008 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2494 | offensiveReach x1.3404 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2495 | allyDamage x0.7011 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2496 | outnumberedCaution x1.5067 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2497 | setupValue x1.198 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2498 | outnumberedCaution x0.6936 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2499 | maneuverTempoDenial x0.8498 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2500 | threatExposure x0.6181 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2501 | threatExposure x1.5306 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2502 | setupValue x0.9552 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2503 | mobilityDenial x0.7351 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2504 | setupValue x1.2463 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2505 | allyDamage x0.7492 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2506 | mobilityDenial x0.6406 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2507 | allyDamage x1.1464 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2508 | mobilityDenial x1.2429 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2509 | mobilityDenial x0.9007 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2510 | allyDamage x1.4777 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2511 | enemyDamage x1.4836 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2512 | maneuverTempoDenial x0.9592 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2513 | threatExposure x1.2214 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2514 | threatExposure x0.6956 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2515 | enemyDamage x0.687 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 2516 | setupValue x1.0212 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2517 | enemyDamage x1.1766 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2518 | outnumberedCaution x1.4371 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2519 | outnumberedCaution x1.029 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2520 | outnumberedCaution x0.8694 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2521 | maneuverTempoDenial x1.2262 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2522 | outnumberedCaution x1.4413 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2523 | maneuverTempoDenial x1.4871 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2524 | maneuverTempoDenial x1.1997 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2525 | mobilityDenial x1.2554 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2526 | allyDamage x1.287 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2527 | allyDamage x1.1201 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2528 | closing x1.3642 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2529 | allyDamage x0.9897 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2530 | offensiveReach x1.4279 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2531 | maneuverTempoDenial x1.1548 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2532 | maneuverTempoDenial x1.47 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2533 | mobilityDenial x1.2084 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2534 | lowHpCaution x1.447 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2535 | threatExposure x0.8847 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2536 | maneuverTempoDenial x0.7147 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2537 | closing x1.2613 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2538 | maneuverTempoDenial x0.7303 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2539 | setupValue x1.3676 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2540 | threatExposure x1.4876 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2541 | offensiveReach x0.8842 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2542 | allyDamage x0.966 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2543 | setupValue x0.7931 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2544 | offensiveReach x1.107 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2545 | closing x1.5156 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2546 | allyDamage x1.1601 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2547 | maneuverTempoDenial x1.5045 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2548 | outnumberedCaution x1.244 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2549 | threatExposure x1.4755 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2550 | offensiveReach x1.4488 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2551 | allyDamage x1.2103 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2552 | setupValue x1.4564 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2553 | outnumberedCaution x0.7933 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2554 | mobilityDenial x0.6397 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2555 | lowHpCaution x0.9372 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2556 | setupValue x1.3569 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2557 | outnumberedCaution x1.547 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2558 | mobilityDenial x1.3789 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2559 | maneuverTempoDenial x1.4375 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2560 | maneuverTempoDenial x1.1227 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2561 | outnumberedCaution x1.4933 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2562 | mobilityDenial x0.977 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2563 | lowHpCaution x1.1561 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2564 | maneuverTempoDenial x1.4692 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2565 | allyDamage x0.6905 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2566 | closing x1.4627 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2567 | mobilityDenial x0.6416 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2568 | threatExposure x1.5341 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2569 | lowHpCaution x0.6064 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2570 | allyDamage x1.4837 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2571 | enemyDamage x0.7524 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2572 | allyDamage x1.1632 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2573 | setupValue x0.989 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2574 | outnumberedCaution x1.198 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2575 | setupValue x1.2415 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2576 | allyDamage x1.3754 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2577 | mobilityDenial x1.2283 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2578 | mobilityDenial x0.7907 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2579 | allyDamage x1.0407 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2580 | outnumberedCaution x1.0849 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2581 | mobilityDenial x1.4985 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2582 | allyDamage x1.2437 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2583 | mobilityDenial x1.2392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2584 | closing x1.2 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2585 | mobilityDenial x1.392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2586 | offensiveReach x0.7369 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2587 | threatExposure x0.673 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2588 | outnumberedCaution x0.7062 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2589 | enemyDamage x0.851 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2590 | enemyDamage x1.2428 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2591 | closing x0.8838 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2592 | closing x0.8727 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2593 | mobilityDenial x0.9663 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2594 | mobilityDenial x0.9772 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2595 | lowHpCaution x1.2961 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2596 | outnumberedCaution x1.3044 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2597 | maneuverTempoDenial x1.2429 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2598 | mobilityDenial x0.6917 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2599 | setupValue x1.335 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2600 | lowHpCaution x0.6619 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2601 | allyDamage x1.5171 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2602 | maneuverTempoDenial x1.4436 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2603 | outnumberedCaution x1.1548 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2604 | lowHpCaution x1.3138 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2605 | allyDamage x0.7495 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2606 | outnumberedCaution x0.9494 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2607 | lowHpCaution x1.3924 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2608 | outnumberedCaution x0.8155 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2609 | maneuverTempoDenial x1.5234 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2610 | outnumberedCaution x0.6807 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2611 | mobilityDenial x0.951 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2612 | threatExposure x1.4802 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2613 | outnumberedCaution x0.6283 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2614 | closing x1.462 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2615 | threatExposure x1.4768 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2616 | allyDamage x1.0871 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2617 | setupValue x1.2823 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2618 | mobilityDenial x1.2839 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2619 | mobilityDenial x1.1925 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2620 | maneuverTempoDenial x0.9079 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2621 | outnumberedCaution x1.3391 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2622 | setupValue x1.3235 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2623 | mobilityDenial x0.6439 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2624 | allyDamage x1.4538 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2625 | threatExposure x1.2683 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2626 | setupValue x0.7642 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2627 | outnumberedCaution x1.5985 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2628 | setupValue x0.6762 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2629 | closing x1.2035 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2630 | lowHpCaution x1.5292 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2631 | outnumberedCaution x1.2445 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2632 | setupValue x0.758 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2633 | allyDamage x1.5046 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2634 | threatExposure x1.4509 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2635 | mobilityDenial x1.3759 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2636 | maneuverTempoDenial x1.4883 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2637 | offensiveReach x1.0103 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2638 | allyDamage x1.0653 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2639 | closing x1.2634 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2640 | offensiveReach x0.9589 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2641 | enemyDamage x0.9419 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2642 | threatExposure x1.2149 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2643 | mobilityDenial x1.1983 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2644 | mobilityDenial x1.1435 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2645 | mobilityDenial x0.7708 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2646 | closing x0.6615 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2647 | allyDamage x1.4152 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2648 | maneuverTempoDenial x0.8974 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2649 | lowHpCaution x0.8429 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2650 | lowHpCaution x1.3872 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2651 | closing x1.0599 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2652 | setupValue x0.7466 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2653 | allyDamage x0.6937 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2654 | threatExposure x0.8986 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2655 | setupValue x0.8443 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2656 | maneuverTempoDenial x1.4956 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2657 | setupValue x0.9118 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2658 | threatExposure x1.5544 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2659 | maneuverTempoDenial x0.8459 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2660 | offensiveReach x0.6626 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2661 | maneuverTempoDenial x1.5825 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2662 | offensiveReach x1.0923 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2663 | closing x0.8606 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2664 | setupValue x0.9078 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2665 | setupValue x1.084 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2666 | lowHpCaution x1.4958 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2667 | closing x1.5575 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2668 | setupValue x0.8347 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2669 | offensiveReach x1.3591 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2670 | closing x1.3745 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2671 | lowHpCaution x1.2933 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2672 | outnumberedCaution x1.209 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2673 | maneuverTempoDenial x1.3013 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2674 | threatExposure x1.1352 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2675 | lowHpCaution x1.4293 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2676 | setupValue x1.1971 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2677 | offensiveReach x0.7643 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2678 | enemyDamage x0.9504 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2679 | allyDamage x1.4516 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2680 | offensiveReach x1.5375 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2681 | mobilityDenial x1.0373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2682 | offensiveReach x1.3038 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2683 | maneuverTempoDenial x0.7206 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2684 | closing x0.7055 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2685 | enemyDamage x1.2833 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2686 | setupValue x1.2115 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2687 | mobilityDenial x1.2365 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2688 | outnumberedCaution x1.1971 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2689 | outnumberedCaution x0.7871 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2690 | mobilityDenial x1.2684 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2691 | outnumberedCaution x1.1235 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2692 | offensiveReach x1.4554 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2693 | lowHpCaution x1.4702 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2694 | allyDamage x1.161 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2695 | outnumberedCaution x1.3599 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2696 | enemyDamage x1.4875 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2697 | threatExposure x1.4332 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2698 | enemyDamage x0.9485 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2699 | maneuverTempoDenial x1.1694 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2700 | allyDamage x1.2041 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2701 | threatExposure x0.7432 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2702 | mobilityDenial x1.2945 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2703 | lowHpCaution x1.1893 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2704 | allyDamage x1.5502 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2705 | offensiveReach x1.2405 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2706 | outnumberedCaution x0.7954 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2707 | threatExposure x1.0144 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2708 | setupValue x1.1157 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2709 | mobilityDenial x1.5521 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2710 | enemyDamage x1.0837 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2711 | setupValue x0.8397 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2712 | enemyDamage x1.1956 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2713 | enemyDamage x1.203 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2714 | allyDamage x0.6483 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2715 | mobilityDenial x1.2522 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2716 | lowHpCaution x0.6422 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2717 | lowHpCaution x0.7879 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2718 | lowHpCaution x0.9371 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2719 | mobilityDenial x0.8296 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2720 | threatExposure x0.6626 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2721 | mobilityDenial x1.014 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2722 | threatExposure x0.7309 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2723 | enemyDamage x1.4525 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2724 | setupValue x1.392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2725 | setupValue x0.7477 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2726 | enemyDamage x1.5467 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2727 | allyDamage x1.3305 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2728 | offensiveReach x0.7551 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2729 | closing x0.8612 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2730 | threatExposure x0.9294 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2731 | allyDamage x1.5646 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2732 | offensiveReach x0.6075 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2733 | threatExposure x1.394 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2734 | allyDamage x1.0811 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2735 | mobilityDenial x1.0264 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2736 | offensiveReach x0.9937 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2737 | enemyDamage x1.2522 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2738 | lowHpCaution x1.2893 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2739 | setupValue x1.1727 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2740 | closing x1.1855 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2741 | allyDamage x0.6939 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2742 | outnumberedCaution x0.6982 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2743 | setupValue x0.7208 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2744 | mobilityDenial x1.1333 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2745 | threatExposure x1.4606 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2746 | lowHpCaution x1.0539 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2747 | maneuverTempoDenial x0.9772 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2748 | setupValue x1.429 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2749 | maneuverTempoDenial x1.4724 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2750 | outnumberedCaution x1.351 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2751 | threatExposure x0.6472 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2752 | lowHpCaution x0.9561 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2753 | lowHpCaution x1.406 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2754 | allyDamage x1.382 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2755 | mobilityDenial x1.3662 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2756 | offensiveReach x1.4899 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2757 | closing x0.6703 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2758 | allyDamage x1.1877 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2759 | lowHpCaution x1.4774 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2760 | enemyDamage x1.0935 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2761 | enemyDamage x0.6471 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2762 | offensiveReach x1.4672 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2763 | closing x0.8426 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2764 | allyDamage x1.5742 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2765 | outnumberedCaution x0.6373 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2766 | threatExposure x0.8687 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2767 | closing x0.8247 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2768 | lowHpCaution x0.9995 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2769 | outnumberedCaution x1.3423 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2770 | outnumberedCaution x1.0877 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2771 | maneuverTempoDenial x1.53 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2772 | allyDamage x0.8799 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2773 | closing x1.2225 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2774 | lowHpCaution x1.0156 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2775 | lowHpCaution x0.6769 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2776 | offensiveReach x0.7212 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2777 | maneuverTempoDenial x0.6046 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2778 | closing x1.1795 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2779 | mobilityDenial x1.1859 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2780 | setupValue x1.2196 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2781 | offensiveReach x1.1354 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2782 | allyDamage x0.6266 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2783 | offensiveReach x1.1859 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2784 | mobilityDenial x0.8734 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2785 | lowHpCaution x0.8246 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2786 | allyDamage x1.3859 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2787 | offensiveReach x1.1712 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2788 | threatExposure x0.7645 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2789 | closing x0.6493 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2790 | lowHpCaution x1.2724 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2791 | setupValue x1.2522 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2792 | threatExposure x0.6134 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2793 | mobilityDenial x1.3292 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2794 | allyDamage x1.3648 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2795 | threatExposure x0.8241 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2796 | outnumberedCaution x0.7713 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2797 | threatExposure x0.9094 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2798 | lowHpCaution x1.0041 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2799 | allyDamage x1.3404 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2800 | closing x1.4422 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2801 | mobilityDenial x0.8484 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2802 | mobilityDenial x0.698 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2803 | closing x0.795 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2804 | maneuverTempoDenial x1.2335 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2805 | outnumberedCaution x0.6885 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2806 | allyDamage x1.088 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2807 | threatExposure x0.934 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2808 | maneuverTempoDenial x1.1399 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2809 | lowHpCaution x0.7646 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2810 | mobilityDenial x1.1917 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2811 | enemyDamage x1.1889 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2812 | mobilityDenial x0.8394 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2813 | enemyDamage x1.2789 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2814 | outnumberedCaution x1.3501 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2815 | enemyDamage x0.6318 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2816 | outnumberedCaution x0.729 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2817 | outnumberedCaution x1.0116 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2818 | offensiveReach x1.3605 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2819 | offensiveReach x1.1073 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2820 | maneuverTempoDenial x0.9004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2821 | mobilityDenial x1.233 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2822 | enemyDamage x0.82 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2823 | offensiveReach x1.3557 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2824 | maneuverTempoDenial x1.065 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2825 | maneuverTempoDenial x0.7492 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2826 | enemyDamage x0.811 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2827 | outnumberedCaution x1.2894 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2828 | closing x0.7864 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2829 | allyDamage x1.5508 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2830 | maneuverTempoDenial x0.8792 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2831 | enemyDamage x1.3056 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2832 | setupValue x0.711 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2833 | enemyDamage x1.5126 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2834 | closing x1.3935 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2835 | setupValue x0.8739 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2836 | offensiveReach x0.8798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2837 | enemyDamage x1.0562 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2838 | closing x0.7336 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2839 | threatExposure x0.9545 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2840 | offensiveReach x0.9144 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2841 | threatExposure x0.8552 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2842 | threatExposure x0.629 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2843 | maneuverTempoDenial x1.2404 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2844 | enemyDamage x1.491 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2845 | allyDamage x1.125 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2846 | offensiveReach x1.5941 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 2847 | offensiveReach x0.9759 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2848 | lowHpCaution x1.3524 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2849 | setupValue x1.3894 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2850 | closing x1.4473 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2851 | maneuverTempoDenial x0.8422 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2852 | offensiveReach x0.8481 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2853 | lowHpCaution x1.3499 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2854 | setupValue x1.5798 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2855 | setupValue x0.8273 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2856 | threatExposure x1.2283 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2857 | setupValue x0.7793 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2858 | closing x1.4645 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2859 | outnumberedCaution x1.0831 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2860 | closing x1.2768 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2861 | allyDamage x1.1587 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2862 | outnumberedCaution x1.538 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2863 | lowHpCaution x1.4643 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2864 | enemyDamage x1.0781 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2865 | enemyDamage x0.8466 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 2866 | allyDamage x0.9729 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2867 | lowHpCaution x0.7261 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2868 | mobilityDenial x0.754 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2869 | offensiveReach x0.6517 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2870 | closing x0.6129 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2871 | mobilityDenial x1.2426 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2872 | allyDamage x0.6282 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2873 | maneuverTempoDenial x1.5093 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2874 | setupValue x0.605 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2875 | mobilityDenial x0.8943 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2876 | offensiveReach x0.732 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2877 | offensiveReach x1.0504 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2878 | mobilityDenial x0.8925 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2879 | maneuverTempoDenial x0.6074 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2880 | outnumberedCaution x1.2805 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2881 | enemyDamage x1.079 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2882 | setupValue x0.9126 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2883 | maneuverTempoDenial x1.0866 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2884 | outnumberedCaution x0.9809 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2885 | outnumberedCaution x1.152 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2886 | mobilityDenial x0.6063 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2887 | allyDamage x1.3965 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2888 | lowHpCaution x1.2484 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2889 | closing x0.6469 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2890 | enemyDamage x0.7903 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2891 | closing x1.3668 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2892 | allyDamage x1.1066 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2893 | lowHpCaution x0.9267 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2894 | setupValue x0.7956 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2895 | offensiveReach x1.4262 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2896 | enemyDamage x0.8003 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 2897 | offensiveReach x1.4847 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2898 | lowHpCaution x1.45 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2899 | allyDamage x1.0666 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2900 | offensiveReach x0.6619 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2901 | allyDamage x1.0838 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2902 | closing x0.9707 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2903 | offensiveReach x0.8094 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2904 | offensiveReach x0.9959 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2905 | closing x1.013 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2906 | allyDamage x1.0827 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2907 | setupValue x1.3725 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2908 | maneuverTempoDenial x1.1892 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2909 | maneuverTempoDenial x0.6032 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2910 | mobilityDenial x1.1303 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2911 | threatExposure x0.9472 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2912 | allyDamage x0.7808 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2913 | mobilityDenial x1.0958 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2914 | enemyDamage x1.5837 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2915 | mobilityDenial x1.2239 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2916 | mobilityDenial x1.3694 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2917 | allyDamage x1.3262 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2918 | setupValue x0.7111 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2919 | allyDamage x1.3569 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2920 | threatExposure x0.6595 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2921 | maneuverTempoDenial x0.9532 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2922 | threatExposure x1.5218 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 2923 | mobilityDenial x0.9671 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2924 | setupValue x1.3497 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2925 | maneuverTempoDenial x1.0953 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2926 | closing x1.3923 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2927 | threatExposure x1.0916 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2928 | closing x1.4782 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2929 | threatExposure x1.4248 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2930 | setupValue x1.1686 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2931 | mobilityDenial x1.4408 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2932 | maneuverTempoDenial x0.951 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2933 | setupValue x1.3706 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2934 | outnumberedCaution x0.7916 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2935 | maneuverTempoDenial x0.6341 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2936 | maneuverTempoDenial x0.8296 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2937 | closing x0.7009 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2938 | allyDamage x1.1189 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2939 | allyDamage x0.8608 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2940 | threatExposure x1.0375 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2941 | outnumberedCaution x1.2202 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2942 | enemyDamage x0.7203 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2943 | allyDamage x1.5105 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2944 | mobilityDenial x1.4641 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2945 | offensiveReach x1.1391 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2946 | threatExposure x1.0375 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2947 | lowHpCaution x0.8838 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2948 | outnumberedCaution x1.4193 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2949 | offensiveReach x0.7455 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2950 | enemyDamage x1.2436 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2951 | setupValue x1.4503 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2952 | closing x1.5861 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2953 | lowHpCaution x0.9791 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2954 | enemyDamage x0.808 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 2955 | offensiveReach x1.3415 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 2956 | threatExposure x1.4589 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2957 | outnumberedCaution x0.6793 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2958 | mobilityDenial x0.72 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2959 | allyDamage x1.0198 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2960 | setupValue x1.1615 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2961 | closing x0.8035 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 2962 | maneuverTempoDenial x0.9659 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2963 | closing x1.3504 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2964 | mobilityDenial x1.3847 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2965 | allyDamage x1.4232 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2966 | offensiveReach x0.6535 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 2967 | enemyDamage x0.7846 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 2968 | lowHpCaution x0.9003 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2969 | enemyDamage x1.3912 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2970 | offensiveReach x0.9543 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2971 | maneuverTempoDenial x1.3601 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2972 | lowHpCaution x1.4704 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2973 | outnumberedCaution x1.554 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2974 | outnumberedCaution x0.9615 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2975 | threatExposure x1.4124 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2976 | threatExposure x0.9983 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2977 | maneuverTempoDenial x1.4919 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2978 | offensiveReach x1.063 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2979 | setupValue x0.8764 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2980 | mobilityDenial x1.2936 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2981 | setupValue x1.1996 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2982 | closing x0.6419 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2983 | threatExposure x1.2991 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2984 | closing x0.6115 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2985 | enemyDamage x1.4312 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2986 | maneuverTempoDenial x0.6847 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2987 | maneuverTempoDenial x1.1136 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2988 | mobilityDenial x0.6876 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2989 | allyDamage x1.4582 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2990 | offensiveReach x0.7906 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2991 | outnumberedCaution x1.4639 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2992 | lowHpCaution x0.9064 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2993 | maneuverTempoDenial x0.6429 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 2994 | mobilityDenial x0.8469 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2995 | threatExposure x1.2377 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 2996 | enemyDamage x1.4281 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2997 | outnumberedCaution x0.7726 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2998 | allyDamage x1.2052 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 2999 | offensiveReach x1.3648 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3000 | closing x1.5991 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3001 | closing x0.8835 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3002 | threatExposure x1.0711 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3003 | setupValue x1.1452 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3004 | threatExposure x1.3225 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3005 | threatExposure x0.9307 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3006 | maneuverTempoDenial x1.0724 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3007 | enemyDamage x0.9555 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3008 | mobilityDenial x1.0189 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3009 | threatExposure x1.4113 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3010 | allyDamage x1.3634 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3011 | mobilityDenial x0.6279 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3012 | setupValue x1.5586 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3013 | offensiveReach x0.7882 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3014 | maneuverTempoDenial x1.1595 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3015 | offensiveReach x1.2941 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3016 | allyDamage x0.9665 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3017 | allyDamage x1.1547 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3018 | mobilityDenial x1.4578 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3019 | allyDamage x0.6812 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3020 | mobilityDenial x0.7053 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3021 | enemyDamage x1.4962 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3022 | closing x1.4863 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3023 | offensiveReach x1.0071 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3024 | allyDamage x0.6705 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3025 | offensiveReach x0.8182 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3026 | allyDamage x1.5676 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3027 | outnumberedCaution x0.9197 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3028 | lowHpCaution x0.9025 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3029 | offensiveReach x0.8363 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3030 | closing x1.5944 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3031 | outnumberedCaution x1.1463 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3032 | setupValue x1.5028 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3033 | allyDamage x0.8261 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3034 | mobilityDenial x1.2872 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3035 | mobilityDenial x1.3667 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3036 | setupValue x1.5997 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3037 | offensiveReach x1.4682 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3038 | enemyDamage x0.8965 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 3039 | setupValue x0.9384 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3040 | offensiveReach x0.8019 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3041 | maneuverTempoDenial x1.1085 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3042 | maneuverTempoDenial x1.0656 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3043 | lowHpCaution x1.0774 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3044 | allyDamage x0.9492 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3045 | threatExposure x1.5896 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 3046 | setupValue x1.5796 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3047 | enemyDamage x1.3887 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3048 | threatExposure x0.9285 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3049 | setupValue x0.9237 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3050 | closing x0.7969 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3051 | closing x1.0186 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3052 | lowHpCaution x0.6182 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3053 | closing x1.0767 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3054 | allyDamage x1.501 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3055 | mobilityDenial x1.4676 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3056 | mobilityDenial x0.7406 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3057 | lowHpCaution x0.7249 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3058 | threatExposure x0.6849 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3059 | maneuverTempoDenial x1.2747 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3060 | closing x1.4032 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3061 | threatExposure x1.1203 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3062 | closing x0.9662 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3063 | maneuverTempoDenial x1.3362 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3064 | threatExposure x1.1865 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3065 | threatExposure x0.8944 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3066 | mobilityDenial x0.9741 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3067 | threatExposure x1.4888 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3068 | enemyDamage x0.9057 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 3069 | maneuverTempoDenial x0.874 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3070 | maneuverTempoDenial x1.0338 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3071 | outnumberedCaution x1.0701 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3072 | setupValue x1.4823 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3073 | enemyDamage x0.7458 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3074 | setupValue x0.9646 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3075 | allyDamage x0.8549 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3076 | allyDamage x1.2983 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3077 | closing x0.9823 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3078 | lowHpCaution x0.8991 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3079 | setupValue x0.6045 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3080 | setupValue x1.0486 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3081 | threatExposure x1.2257 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3082 | threatExposure x0.9392 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3083 | enemyDamage x0.9007 | baseline-v1:37.5% | 1/6 beaten | rejected |
| 3084 | mobilityDenial x0.6249 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3085 | threatExposure x0.6361 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3086 | mobilityDenial x1.1795 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3087 | outnumberedCaution x0.7932 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3088 | outnumberedCaution x0.9324 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3089 | lowHpCaution x1.5537 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3090 | closing x1.1996 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3091 | allyDamage x1.2187 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3092 | allyDamage x0.8782 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3093 | lowHpCaution x0.6659 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3094 | outnumberedCaution x1.2934 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3095 | setupValue x1.5242 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3096 | lowHpCaution x1.0461 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3097 | allyDamage x0.6127 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3098 | offensiveReach x1.2181 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3099 | mobilityDenial x0.7156 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3100 | closing x0.7014 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3101 | closing x0.8861 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3102 | allyDamage x0.9077 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3103 | lowHpCaution x1.5458 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3104 | closing x0.7307 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3105 | setupValue x0.6244 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3106 | setupValue x0.7149 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3107 | mobilityDenial x1.0446 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3108 | maneuverTempoDenial x0.996 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3109 | allyDamage x1.3775 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3110 | allyDamage x1.5252 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3111 | allyDamage x1.3795 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3112 | closing x1.2553 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3113 | threatExposure x1.1686 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3114 | enemyDamage x0.7623 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3115 | mobilityDenial x1.1782 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3116 | allyDamage x0.8411 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3117 | offensiveReach x0.6959 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3118 | enemyDamage x1.5407 | baseline-v1:25.0% | 3/6 beaten | rejected |
| 3119 | maneuverTempoDenial x0.8692 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3120 | lowHpCaution x1.1594 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3121 | setupValue x0.7498 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3122 | outnumberedCaution x1.3244 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3123 | allyDamage x1.3447 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3124 | closing x0.8767 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3125 | lowHpCaution x1.5335 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3126 | setupValue x1.5668 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3127 | outnumberedCaution x0.6637 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3128 | outnumberedCaution x1.3727 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3129 | offensiveReach x1.3407 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3130 | offensiveReach x1.2746 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3131 | lowHpCaution x0.6793 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3132 | threatExposure x0.9858 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3133 | offensiveReach x1.0058 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3134 | maneuverTempoDenial x0.9584 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3135 | allyDamage x1.2468 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3136 | allyDamage x1.1232 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3137 | enemyDamage x1.2459 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3138 | enemyDamage x0.8062 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3139 | mobilityDenial x0.9448 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3140 | outnumberedCaution x1.0066 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3141 | closing x1.5823 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3142 | offensiveReach x1.5303 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3143 | setupValue x0.9998 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3144 | setupValue x1.3542 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3145 | closing x1.2341 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3146 | enemyDamage x0.825 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3147 | setupValue x0.7038 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3148 | threatExposure x1.5863 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 3149 | enemyDamage x1.1623 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3150 | closing x0.6001 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3151 | threatExposure x0.8535 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3152 | outnumberedCaution x1.1023 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3153 | lowHpCaution x1.4059 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3154 | allyDamage x1.1537 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3155 | allyDamage x0.8681 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3156 | lowHpCaution x1.2432 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3157 | closing x1.5422 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3158 | allyDamage x1.3609 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3159 | closing x1.1631 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3160 | allyDamage x0.996 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3161 | closing x1.3487 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3162 | outnumberedCaution x0.9511 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3163 | closing x0.9201 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3164 | lowHpCaution x1.0288 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3165 | outnumberedCaution x0.8154 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3166 | threatExposure x0.671 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3167 | maneuverTempoDenial x1.4118 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3168 | mobilityDenial x0.9306 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3169 | setupValue x0.9736 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3170 | setupValue x0.6815 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3171 | threatExposure x1.0213 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3172 | setupValue x1.4674 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3173 | outnumberedCaution x1.1731 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3174 | threatExposure x0.8554 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3175 | lowHpCaution x0.7868 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3176 | maneuverTempoDenial x1.233 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3177 | outnumberedCaution x0.8333 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3178 | setupValue x0.7988 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3179 | maneuverTempoDenial x0.6451 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3180 | mobilityDenial x1.5246 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3181 | setupValue x1.4003 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3182 | offensiveReach x1.3536 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3183 | offensiveReach x1.2615 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3184 | outnumberedCaution x1.2112 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3185 | enemyDamage x1.012 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3186 | closing x1.5035 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3187 | threatExposure x1.5223 | baseline-v1:25.0% | 2/6 beaten | rejected |
| 3188 | closing x1.25 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3189 | lowHpCaution x1.2369 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3190 | closing x1.1812 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3191 | offensiveReach x1.2793 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3192 | allyDamage x0.7069 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3193 | threatExposure x0.7671 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3194 | threatExposure x1.2313 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3195 | enemyDamage x0.7085 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3196 | enemyDamage x1.015 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3197 | threatExposure x1.4604 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3198 | threatExposure x0.673 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3199 | lowHpCaution x1.2643 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3200 | threatExposure x0.8299 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3201 | allyDamage x0.7731 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3202 | lowHpCaution x0.9079 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3203 | lowHpCaution x1.324 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3204 | allyDamage x1.2812 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3205 | allyDamage x1.2533 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3206 | enemyDamage x1.1551 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3207 | enemyDamage x0.6192 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3208 | maneuverTempoDenial x0.696 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3209 | mobilityDenial x0.617 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3210 | threatExposure x1.055 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3211 | outnumberedCaution x1.123 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3212 | mobilityDenial x0.9581 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3213 | outnumberedCaution x1.5083 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3214 | mobilityDenial x1.3353 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3215 | maneuverTempoDenial x1.3947 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3216 | lowHpCaution x1.1261 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3217 | mobilityDenial x1.3221 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3218 | mobilityDenial x1.3323 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3219 | setupValue x1.0612 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3220 | allyDamage x0.9799 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3221 | enemyDamage x0.9281 | baseline-v1:43.8% | 2/6 beaten | rejected |
| 3222 | enemyDamage x1.3194 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3223 | enemyDamage x1.4282 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3224 | maneuverTempoDenial x1.2489 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3225 | setupValue x0.9856 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3226 | closing x1.3853 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3227 | maneuverTempoDenial x0.886 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3228 | setupValue x0.6666 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3229 | outnumberedCaution x1.5628 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3230 | closing x1.5492 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3231 | offensiveReach x1.1839 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3232 | threatExposure x0.7511 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3233 | closing x1.5182 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3234 | maneuverTempoDenial x0.7281 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3235 | enemyDamage x1.4673 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3236 | lowHpCaution x0.7355 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3237 | outnumberedCaution x0.7172 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3238 | mobilityDenial x0.8612 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3239 | allyDamage x1.5425 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3240 | threatExposure x1.0565 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3241 | threatExposure x0.8717 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3242 | closing x1.5576 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3243 | lowHpCaution x1.0775 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3244 | offensiveReach x1.3184 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3245 | closing x1.391 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3246 | offensiveReach x1.5588 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3247 | offensiveReach x1.3491 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3248 | outnumberedCaution x1.3146 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3249 | threatExposure x0.9724 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3250 | threatExposure x1.3928 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3251 | offensiveReach x1.3923 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3252 | allyDamage x1.1892 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3253 | allyDamage x1.1537 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3254 | enemyDamage x0.7108 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3255 | threatExposure x1.0185 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3256 | outnumberedCaution x1.114 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3257 | lowHpCaution x1.5631 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3258 | allyDamage x0.6049 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3259 | closing x1.1863 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3260 | threatExposure x1.2313 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3261 | maneuverTempoDenial x1.5316 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3262 | lowHpCaution x1.3311 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3263 | setupValue x0.7004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3264 | lowHpCaution x1.1829 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3265 | closing x0.704 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3266 | lowHpCaution x1.0024 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3267 | setupValue x1.51 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3268 | threatExposure x1.4449 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3269 | offensiveReach x0.8256 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3270 | mobilityDenial x0.7353 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3271 | allyDamage x0.693 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3272 | lowHpCaution x0.6099 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3273 | mobilityDenial x0.9776 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3274 | outnumberedCaution x0.9572 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3275 | allyDamage x1.2351 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3276 | closing x1.1603 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3277 | enemyDamage x1.3542 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3278 | lowHpCaution x1.0864 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3279 | enemyDamage x1.2623 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3280 | lowHpCaution x1.115 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3281 | allyDamage x1.5324 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3282 | setupValue x1.2876 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3283 | setupValue x1.2662 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3284 | closing x1.1552 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3285 | lowHpCaution x0.8616 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3286 | lowHpCaution x1.4004 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3287 | setupValue x0.7023 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3288 | enemyDamage x0.6935 | baseline-v1:50.0% | 1/6 beaten | rejected |
| 3289 | mobilityDenial x0.7657 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3290 | threatExposure x0.6331 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3291 | offensiveReach x0.6282 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3292 | outnumberedCaution x0.78 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3293 | outnumberedCaution x0.8777 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3294 | mobilityDenial x0.9543 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3295 | outnumberedCaution x0.8737 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3296 | setupValue x1.142 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3297 | threatExposure x1.215 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3298 | closing x1.1508 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3299 | allyDamage x1.0105 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3300 | offensiveReach x1.1842 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3301 | maneuverTempoDenial x1.0806 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3302 | maneuverTempoDenial x1.5678 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3303 | offensiveReach x1.4986 | baseline-v1:50.0% | 2/6 beaten | rejected |
| 3304 | threatExposure x0.9223 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3305 | outnumberedCaution x0.6714 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3306 | offensiveReach x0.6995 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3307 | threatExposure x0.6127 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3308 | maneuverTempoDenial x1.528 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3309 | lowHpCaution x0.8079 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3310 | closing x0.7418 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3311 | maneuverTempoDenial x1.3434 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3312 | outnumberedCaution x0.7636 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3313 | enemyDamage x1.266 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3314 | mobilityDenial x1.4143 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3315 | outnumberedCaution x1.534 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3316 | enemyDamage x0.7728 | baseline-v1:43.8% | 1/6 beaten | rejected |
| 3317 | closing x1.2812 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3318 | closing x1.2895 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3319 | enemyDamage x1.4528 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3320 | mobilityDenial x0.9991 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3321 | threatExposure x0.7357 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3322 | allyDamage x0.8528 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3323 | lowHpCaution x0.9549 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3324 | closing x0.7345 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3325 | offensiveReach x1.1217 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3326 | setupValue x0.8514 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3327 | outnumberedCaution x1.4513 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3328 | setupValue x1.5931 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3329 | closing x1.1834 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3330 | setupValue x1.5372 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3331 | outnumberedCaution x0.7939 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3332 | allyDamage x1.463 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3333 | maneuverTempoDenial x1.4808 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3334 | threatExposure x1.1365 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3335 | mobilityDenial x0.7863 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3336 | offensiveReach x1.0437 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3337 | closing x1.3357 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3338 | setupValue x0.6799 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3339 | outnumberedCaution x1.3861 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3340 | outnumberedCaution x0.8615 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3341 | allyDamage x0.7137 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3342 | threatExposure x0.849 | baseline-v1:31.3% | 3/6 beaten | rejected |
| 3343 | outnumberedCaution x1.3055 | baseline-v1:37.5% | 2/6 beaten | rejected |
| 3344 | closing x0.7722 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3345 | enemyDamage x1.5107 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3346 | maneuverTempoDenial x0.7735 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3347 | maneuverTempoDenial x1.0148 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3348 | threatExposure x0.7471 | baseline-v1:31.3% | 2/6 beaten | rejected |
| 3349 | allyDamage x0.7678 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3350 | enemyDamage x1.4854 | baseline-v1:43.8% | 3/6 beaten | rejected |
| 3351 | allyDamage x1.1191 | baseline-v1:37.5% | 3/6 beaten | rejected |
| 3352 | maneuverTempoDenial x1.1174 | baseline-v1:37.5% | 3/6 beaten | rejected |

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-8, n=8

`baseline-v1` (party) vs. `greedy-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 37.5%
- greedy-v1 win rate: 25.0%
- Timeout rate: 37.5%
- Mean rounds to resolution: 21.6

Parallel tournament runner (worker_threads, concurrency=8): 3037ms vs. 6134ms sequential — 2.0x.

---
## 2026-09-02 — Decision-cost profile

### Decision-cost profile (design doc §59) — `greedy-v1` on the mirror arena, seeds 1-4, n=136 real decisions

- Mean wall time per decision: 2.93ms
- Max wall time for one decision: 11.00ms
- Mean real sandbox evaluations per decision: 91.8
- Max real sandbox evaluations for one decision: 203

### Decision-cost profile (design doc §59) — `greedy-v1` on the complex arena, seeds 1-4, n=209 real decisions

- Mean wall time per decision: 281.71ms
- Max wall time for one decision: 1478.00ms
- Mean real sandbox evaluations per decision: 131.7
- Max real sandbox evaluations for one decision: 364

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — lunar-17.json+security-goon.json, seeds 1-4, n=4

`baseline-v1` (party) vs. `greedy-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 25.0%
- greedy-v1 win rate: 25.0%
- Timeout rate: 50.0%
- Mean rounds to resolution: 20.8
- Mean elapsed time per battle: 960.5ms

Parallel tournament runner (worker_threads, concurrency=8): 1519ms vs. 2299ms sequential — 1.5x.

Cost guard OK: mean 960.5ms/battle is 1.7x the greedy-v1 reference (552.3ms/battle), within the configured 3x limit.

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — tough.json+xenowarden-greenhorn.json, seeds 1-48, n=48

`lookahead-v1-no-pileonrisk` (party) vs. `aggressive-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- lookahead-v1-no-pileonrisk win rate: 33.3%
- aggressive-v1 win rate: 66.7%
- Timeout rate: 0.0%
- Mean rounds to resolution: 5.0
- Mean elapsed time per battle: 335.1ms

Parallel tournament runner (worker_threads, concurrency=8): 2455ms vs. 4789ms sequential — 2.0x.

---
## 2026-09-02 — Mirror-match tournament

### Mirror-match tournament (design doc §47) — tough.json+xenowarden-greenhorn.json, seeds 1-48, n=48

`baseline-v1` (party) vs. `aggressive-v1` (opposition) — identical roster on both sides, only the AI profile differs.

- baseline-v1 win rate: 35.4%
- aggressive-v1 win rate: 64.6%
- Timeout rate: 0.0%
- Mean rounds to resolution: 5.4
- Mean elapsed time per battle: 279.4ms

Parallel tournament runner (worker_threads, concurrency=8): 2177ms vs. 3821ms sequential — 1.8x.

---
## 2026-09-04 — Terrain performance, fix 1: skip unread path reconstruction (GH #62, design doc §76.4)

### `reachableCells`'s two full-grid callers (`trueDistanceField`, `pathCost`) never read `.path` — confirmed by reading every call site, not assumed. `includePath: false` skips reconstruction for those two shapes only; every Speed-bounded caller is untouched.

Measured on `personnel-complex-battle.mjs` (44x30, 247 walls), `NORTH_SOUTH_ENDS`, party `lunar-17+tapkey+obozaya` vs. opposition `tough+kuriaku+erabryth`, default `decide()`/`planTurn` AI, seeds 1-5 (n=5, real walled-arena battles are expensive enough that this is a controlled spot-check, not the project's usual n>=48 bar — that bar governs claims about AI *strength*, not a claim about wall-clock cost, which this measures directly and exactly):

| | Before | After | Delta |
|---|---|---|---|
| Total wall time, 5 battles | 84,352 ms | 61,735 ms | **-26.8%** |
| ms/turn | 340.1 | 248.9 | **-26.8%** |

**Zero behavior change, confirmed empirically as well as by unit test**: all 5 seeds produced byte-identical outcomes, round counts, and turn counts before and after (seed 1: party-defeat/5/25 both runs; seed 2: party-victory/10/52; seed 3: party-defeat/15/65; seed 4: party-victory/7/34; seed 5: party-victory/13/72). SF2E combat is chaotic enough that a single differently-chosen destination cascades through the RNG stream into a different fight — identical results across all 5 seeds is strong evidence this is exact, on top of `personnel-pathfind.test.mjs`'s own direct proof that `includePath:false` returns identical costs and reachable sets, only `path: null` instead of the real route.

Methodology: `git stash` isolated the two source files carrying this fix (`personnel-engine/world/pathfind.mjs`, `personnel-engine/decide.mjs`) from the rest of the working tree, benchmarked before, restored, benchmarked after — same process, same machine, back to back.

Two larger fixes remain queued under #62: `trueDistanceField` still floods the whole grid every `decide()` call rather than reusing a field that's a pure function of (target, walls, gridSize, occupancy) — profiled separately at ~58% of a real battle's own wall-clock time, this fix only removes the reconstruction waste WITHIN that flood, not the flood's own repetition; and every MCTS/search policy calls `generateProposals` with no `externalDestCache` at all, paying a fresh flood per tree node with zero reuse (`decide()`'s own default path gets a measured 92.5% cache hit rate; search gets 0%).

---
## 2026-09-04 — Terrain performance, fix 2: persist the real-occupancy distance flood across a turn's 3 real decisions (GH #62, design doc §76.4)

### `trueDistanceField` recomputed a full-grid flood from scratch on every one of a turn's 3 real `decide()` calls, even when nothing relevant had changed. Two rounds of adversarial pre-code review found a critical bug (a fingerprint stored as a bare field would never actually update, making the fix a silent no-op) and two further real issues before any code was written — see design doc §76.4 for the full writeup.

`personnel-engine/engine.mjs`'s `makeTurnProgress` now creates `destCache: { map: new Map(), fingerprint: null }` once per real turn — a container OBJECT, not a bare field, specifically because a Map (or an object wrapping one) survives `runTurn`'s own `{...turnProgress, effective}` copy every action by reference, while a bare string field silently would not (round-1 review finding). `personnel-engine/decide.mjs`'s `planTurn` reads/writes this persistent map ONLY for candidate generation scored against real, current, unmutated occupancy (`plan.length === 0` — before that template's own hypothetical exploration has applied anything); every hypothetical, post-action phase keeps using the pre-existing per-call `sharedDestCache`, exactly as before this fix, so nothing computed against a sandboxed, never-taken branch can contaminate a real decision (round-1 review finding). Invalidation is a cheap occupancy fingerprint, checked once per `planTurn` call, clearing the whole persistent map on any mismatch — coarse and deliberately so: a false mismatch only costs a wasted recompute, never a wrong answer. A local, un-persisted fallback (`turn.destCache ?? {...}`) keeps every hand-built-`turn` test call site (~30 of them, found by round-2 review) working exactly as before this fix, never a crash.

**Measured, isolated from fix 1** (same 5-seed walled-battle benchmark, `personnel-complex-battle.mjs`, `NORTH_SOUTH_ENDS`; fix 2 disabled by omitting just the `destCache` field from `makeTurnProgress` — a surgical, one-line toggle that leaves fix 1 and everything else untouched, benchmarked back-to-back to control for this machine's own known ±30% load variance rather than comparing across different measurement sessions):

| | Fix 1 only | Fix 1 + fix 2 |
|---|---|---|
| Total wall time, 5 battles | 116,183 ms | 78,626 ms |
| ms/turn | 468.5 | 317.0 |

**-32.3%, on top of fix 1's own -26.8%.** Same standard as fix 1: all 5 seeds produced byte-identical outcomes, round counts, and turn counts with fix 2 on and off.

**Two new regression tests prove this is real reuse, not just "nothing broke"** (`test/battle-simulator/personnel-decide.test.mjs`, GH #62 section): a floor-count instrumentation hook (`resetFloodCount`/`getFloodCount`, mirroring `engine.mjs`'s own `sandboxForkCount` pattern, added directly inside `reachableCells` — the one seam every flood passes through regardless of caching) proves a second, occupancy-unchanged `decide()` call floods strictly less than the first; a direct real-occupancy-mutation test proves the persistent cache's own fingerprint changes on a real mid-turn kill and stops treating the dead combatant's square as occupied. Both were verified load-bearing the same way as fix 1's and #54's own tests: temporarily reintroducing the exact bug round-1 review found (a non-persisting local container) makes exactly these two tests fail, nothing else.

**One fix remains queued under #62**: every MCTS/search policy still calls `generateProposals` with no destination cache at all, paying a fresh full-grid flood per tree node with zero reuse — `decide()`'s own real-turn path now benefits from both fixes above, search does not. Deliberately out of scope for fix 2 (design doc §76.4 Decision 4): sharing a cache safely across distinct MCTS sandbox `state` objects is a harder, separately-scoped problem (a content-addressed cache keyed by the occupancy fingerprint itself, not by turn-lifetime object identity), likely to need its own adversarial review pass before code, matching how fix 2 itself was developed.

---
## 2026-09-12 — Terrain performance, fix 3: lineOfEffect/hasCover result cache — real, safe, and MEASURED to have no effect on wall-clock time (GH #62)

### The first real MCTS-specific measurement logged in this file. `lineOfEffect`/`hasCover` cache their result per `(predicate, unordered point-pair, walls-reference)`, mirroring `moveBlockedBetween`'s own existing WeakMap-keyed-on-walls index. Before writing a design around it, the actual redundancy was measured directly rather than assumed — and the result corrected the direction of the investigation before any further design effort went into the wrong target.

Measured on `personnel-complex-battle.mjs` (44x30, 247 walls), party `lunar-17+tapkey+bennit+vorza-moonshot` vs. opposition `security-goon+xenowarden-greenhorn+erabryth+tough`, `RANDOM_ARCS`, a single real `mcts-puct-v1` decision (500 iterations, maxDepth 4, seed 1):

| | Before cache | After cache |
|---|---|---|
| Total decide() wall time | ~3,300 ms | ~3,300 ms — **no measurable change** |
| `lineOfEffect`/`hasCover` calls | 47,201 total | 47,201 total, 46,549 cache hits (668 distinct results — **a 70x repeat ratio**) |

**The 70x repeat ratio is real** (overwhelmingly from `evaluateState`'s own per-(ally,enemy)-pair loop re-querying the same small position space across ~580 tree-node expansions in one search — see the new `resetEvaluateStateCallCount`/`getEvaluateStateCallCount` instrumentation, `state-value.mjs`), **but eliminating 98.6% of these calls did not move total wall-clock time at all.** Each individual geometry query is cheap enough in absolute terms, even at 247 walls, that caching it doesn't matter — directly confirming, now for the MCTS path specifically and not just `decide()`, the profiling finding that originally corrected this issue's own Cause-1/Cause-2 priority back on 2026-09-04.

**Where the time actually goes, measured directly** (new `getFloodTimeMs()` instrumentation, `pathfind.mjs`, cumulative time inside `reachableCells`): **~2,780 ms of the ~3,300 ms total — ~83% — is spent inside pathfinding floods.** 232 floods for this one decision, zero reuse across any of them, exactly matching fix 2's own already-logged remaining gap above: every MCTS tree node still calls `generateProposals` with no destination cache at all.

**Kept anyway**: the cache is a genuine, zero-risk, permanent improvement (proven-pure functions, static terrain, no occupancy hazard whatsoever — unlike the pathfinding cache below) and directly informs future measurement (a query-heavy future evaluator term would benefit automatically). It just isn't the fix #62 still needs.

**Real next step, now precisely scoped instead of guessed at**: a content-addressed, occupancy-fingerprint-keyed pathfinding cache threaded through `mcts-puct.mjs`/`mcts.mjs`'s own tree expansion. If MCTS could achieve even a fraction of `decide()`'s own already-measured 92.5% flood-reuse rate (fix 2 above), the arithmetic on this same benchmark projects total decide() time dropping from ~3.3s toward the ~0.5-0.8s range — a projection, not a promise, and the real design work (occupancy-safety across branches with different combatants alive/dead/repositioned) is the hard, correctness-sensitive part, not yet attempted.

Also newly established here: the "150-185s walled-arena MCTS battles" figure quoted in this issue's own 2026-09-04 comments predates all three fixes now shipped under #62 (this one and the two above) — no post-fix full-battle MCTS timing existed anywhere in this file before this entry. Worth a real end-to-end re-measurement before the next design projects savings off that number.

---
